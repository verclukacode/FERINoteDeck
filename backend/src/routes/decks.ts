import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";
import { serialize } from "../lib/serialize";
import {
	RESET_CARD_FIELDS,
	getOrCreateStudySettings,
} from "../lib/studySettings";

// The study day rolls over at `hour` local time (Anki's "next day starts at").
// Returns [start, end) of the current study day in unix ms (server-local tz).
function studyDayWindow(nowMs: number, hour: number): [number, number] {
	const d = new Date(nowMs);
	const rollover = new Date(
		d.getFullYear(),
		d.getMonth(),
		d.getDate(),
		hour,
		0,
		0,
		0,
	).getTime();
	const start = nowMs < rollover ? rollover - 86_400_000 : rollover;
	return [start, start + 86_400_000];
}

/**
 * @openapi
 * tags:
 *   - name: Decks
 *     description: Flashcard decks, scoped to the authenticated user
 */
const router = Router();

/**
 * @openapi
 * /api/decks:
 *   get:
 *     summary: List all of the user's decks
 *     tags: [Decks]
 *     responses:
 *       200: { description: Array of decks }
 */
router.get("/", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";
	const decks = await prisma.deck.findMany({
		where: { userId: uid },
		orderBy: { order: "asc" },
	});

	// For cloned decks, attach the original owner info via the invite record
	const clonedIds = decks
		.map((d) => d.sharedFromDeckId)
		.filter(Boolean) as string[];
	const invites = clonedIds.length
		? await prisma.deckInvite.findMany({
				where: {
					deckId: { in: clonedIds },
					recipientId: uid,
					status: "accepted",
				},
				select: {
					deckId: true,
					sender: { select: { username: true, avatarUrl: true, email: true } },
				},
			})
		: [];
	const ownerMap = new Map(invites.map((i) => [i.deckId, i.sender]));

	const result = decks.map((d) =>
		d.sharedFromDeckId
			? { ...d, _owner: ownerMap.get(d.sharedFromDeckId) ?? null }
			: d,
	);

	res.json(result);
});

/**
 * @openapi
 * /api/decks:
 *   post:
 *     summary: Create a deck in a flashcard folder
 *     tags: [Decks]
 *     responses:
 *       201: { description: The created deck }
 *       400: { description: Folder not found }
 */
router.post("/", async (req: Request, res: Response) => {
	const { folderId, name, cards } = req.body as {
		folderId?: string;
		name?: string;
		cards?: Array<{ question?: string; answer?: string; type?: string }>;
	};
	const userId = req.user?.uid ?? "";
	const folder = await prisma.flashcardFolder.findFirst({
		where: { id: folderId, userId },
	});
	if (!folder) {
		return res.status(400).json({ error: "Folder not found" });
	}
	const order = await prisma.deck.count({ where: { folderId } });

	const incomingCards = Array.isArray(cards) ? cards : [];
	const result = await prisma.$transaction(async (tx) => {
		const deck = await tx.deck.create({
			data: {
				userId,
				folderId: folder.id,
				name: (name ?? "").trim() || "New deck",
				order,
			},
		});
		if (incomingCards.length) {
			await tx.flashCard.createMany({
				data: incomingCards.map((c, i) => ({
					userId,
					deckId: deck.id,
					type: typeof c.type === "string" ? c.type : "rate",
					question: String(c.question ?? ""),
					answer: String(c.answer ?? ""),
					order: i,
				})),
			});
		}
		const createdCards = await tx.flashCard.findMany({
			where: { deckId: deck.id },
			// Strip BigInt scheduling fields from the response — matches the
			// shape cloneDeckForUser returns so the frontend's addDeckFromClone
			// can hydrate state uniformly.
			select: {
				id: true,
				userId: true,
				deckId: true,
				type: true,
				question: true,
				answer: true,
				order: true,
				state: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: { order: "asc" },
		});
		return { deck, cards: createdCards };
	});

	// Preserve existing single-deck contract when no cards are provided so
	// existing callers (the "+ New deck" button) keep working unchanged.
	if (incomingCards.length === 0) {
		res.status(201).json(result.deck);
	} else {
		res.status(201).json(result);
	}
});

/**
 * @openapi
 * /api/decks/order:
 *   put:
 *     summary: Bulk-save deck order and folder membership (after drag-and-drop)
 *     tags: [Decks]
 *     responses:
 *       204: { description: Saved }
 *       400: { description: Unknown folder referenced }
 */
router.put("/order", async (req: Request, res: Response) => {
	const { decks } = req.body as {
		decks?: Array<{ id: string; folderId: string; order: number }>;
	};
	if (!Array.isArray(decks)) {
		return res.status(400).json({ error: "decks must be an array" });
	}
	const folderIds = [...new Set(decks.map((d) => d.folderId))];
	const owned = await prisma.flashcardFolder.findMany({
		where: { id: { in: folderIds }, userId: req.user?.uid ?? "" },
		select: { id: true },
	});
	if (owned.length !== folderIds.length) {
		return res.status(400).json({ error: "Unknown folder referenced" });
	}
	await prisma.$transaction(
		decks.map((d) =>
			prisma.deck.updateMany({
				where: { id: d.id, userId: req.user?.uid ?? "" },
				data: { folderId: d.folderId, order: d.order },
			}),
		),
	);
	res.status(204).end();
});

/**
 * @openapi
 * /api/decks/{id}/queue:
 *   get:
 *     summary: Due study queue for a deck (respects daily limits)
 *     tags: [Decks]
 *     responses:
 *       200: { description: "{ counts, cards }" }
 *       404: { description: Deck not found }
 */
router.get("/:id/queue", async (req: Request, res: Response) => {
	const userId = req.user?.uid ?? "";
	const deckId = String(req.params.id);
	const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
	if (!deck) {
		return res.status(404).json({ error: "Deck not found" });
	}

	const settings = await getOrCreateStudySettings(userId);
	const now = Date.now();
	const [startOfDay, endOfDay] = studyDayWindow(
		now,
		settings.newDayStartsAtHour,
	);

	// Learning/relearning cards due now — never capped.
	const learning = await prisma.flashCard.findMany({
		where: {
			deckId,
			userId,
			state: { in: ["learning", "relearning"] },
			due: { lte: BigInt(now) },
		},
		orderBy: { due: "asc" },
	});

	// Reviews due by end of the study day, capped by remaining daily reviews.
	const reviewsDoneToday = await prisma.review.count({
		where: {
			deckId,
			userId,
			prevState: "review",
			reviewedAt: { gte: BigInt(startOfDay), lt: BigInt(endOfDay) },
		},
	});
	const reviewCap = Math.max(0, settings.maxReviewsPerDay - reviewsDoneToday);
	const reviews = reviewCap
		? await prisma.flashCard.findMany({
				where: {
					deckId,
					userId,
					state: "review",
					due: { lte: BigInt(endOfDay) },
				},
				orderBy: { due: "asc" },
				take: reviewCap,
			})
		: [];

	// New cards, capped by remaining daily new allowance.
	const newIntroducedToday = await prisma.review.count({
		where: {
			deckId,
			userId,
			prevState: "new",
			reviewedAt: { gte: BigInt(startOfDay), lt: BigInt(endOfDay) },
		},
	});
	const newCap = Math.max(0, settings.newCardsPerDay - newIntroducedToday);
	const newCards = newCap
		? await prisma.flashCard.findMany({
				where: { deckId, userId, state: "new" },
				orderBy: { order: "asc" },
				take: newCap,
			})
		: [];

	res.json(
		serialize({
			counts: {
				new: newCards.length,
				learning: learning.length,
				review: reviews.length,
			},
			cards: [...learning, ...reviews, ...newCards],
		}),
	);
});

/**
 * @openapi
 * /api/decks/{id}/reset:
 *   post:
 *     summary: Reset study progress of all cards in a deck (keeps revlog)
 *     tags: [Decks]
 *     responses:
 *       200: { description: "{ count }" }
 *       404: { description: Deck not found }
 */
// GET /api/decks/:id/stats/today — cards reviewed today, avg grade, time spent
router.get("/:id/stats/today", async (req: Request, res: Response) => {
	const userId = req.user?.uid ?? "";
	const deckId = String(req.params.id);

	const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
	if (!deck) return res.status(404).json({ error: "Deck not found" });

	const settings = await getOrCreateStudySettings(userId);
	const now = Date.now();
	const [startOfDay, endOfDay] = studyDayWindow(
		now,
		settings.newDayStartsAtHour,
	);

	const reviews = await prisma.review.findMany({
		where: {
			deckId,
			userId,
			reviewedAt: { gte: BigInt(startOfDay), lt: BigInt(endOfDay) },
		},
		select: { grade: true, elapsedMs: true },
	});

	const count = reviews.length;
	const correct = reviews.filter((r) => r.grade >= 3).length;
	const correctRate = count ? Math.round((correct / count) * 100) : null;
	const totalMs = reviews.reduce((s, r) => s + (r.elapsedMs ?? 0), 0);

	res.json({ count, correctRate, totalMs });
});

router.post("/:id/reset", async (req: Request, res: Response) => {
	const userId = req.user?.uid ?? "";
	const deckId = String(req.params.id);
	const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
	if (!deck) {
		return res.status(404).json({ error: "Deck not found" });
	}
	const result = await prisma.flashCard.updateMany({
		where: { deckId, userId },
		data: RESET_CARD_FIELDS,
	});
	res.json({ count: result.count });
});

/**
 * @openapi
 * /api/decks/{id}/leaderboard:
 *   get:
 *     summary: Rank deck members by average SM-2 ease factor
 *     tags: [Decks]
 *     responses:
 *       200: { description: Sorted member list }
 *       404: { description: Deck not found or not a member }
 */
router.get("/:id/leaderboard", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";
	const deckId = String(req.params.id);

	const deck = await prisma.deck.findUnique({
		where: { id: deckId },
		select: { id: true, userId: true, sharedFromDeckId: true },
	});
	if (!deck) return res.status(404).json({ error: "Deck not found" });

	// Resolve canonical source: caller hit the owner's deck, or a member's clone.
	const sourceDeckId = deck.sharedFromDeckId ?? deck.id;

	// Authz: caller must own the source OR own a clone whose sharedFromDeckId
	// points at it. (deck.userId === uid is the easy case: own the source or
	// own this clone.)
	const isOwnerOfThis = deck.userId === uid;
	if (!isOwnerOfThis) {
		// Caller is not the owner of this row; check membership via lineage.
		const myClone = await prisma.deck.findFirst({
			where: { sharedFromDeckId: sourceDeckId, userId: uid },
			select: { id: true },
		});
		const ownsSource = deck.sharedFromDeckId === null && deck.userId === uid;
		if (!myClone && !ownsSource) {
			return res.status(404).json({ error: "Not a member" });
		}
	}

	const memberDecks = await prisma.deck.findMany({
		where: {
			OR: [{ id: sourceDeckId }, { sharedFromDeckId: sourceDeckId }],
		},
		select: {
			id: true,
			userId: true,
			sharedFromDeckId: true,
			user: { select: { username: true, avatarUrl: true } },
		},
	});

	const stats = await prisma.flashCard.groupBy({
		by: ["deckId"],
		where: { deckId: { in: memberDecks.map((d) => d.id) } },
		_avg: { ease: true },
		_count: { _all: true },
	});
	const byDeck = new Map(stats.map((s) => [s.deckId, s]));

	const rows = memberDecks.map((d) => {
		const s = byDeck.get(d.id);
		return {
			userId: d.userId,
			username: d.user.username,
			avatarUrl: d.user.avatarUrl,
			avgEase: s?._avg.ease ?? null,
			cardCount: s?._count._all ?? 0,
			isOwner: d.sharedFromDeckId === null,
			isMe: d.userId === uid,
		};
	});
	rows.sort((a, b) => {
		// Members with no cards sit at the bottom.
		if (a.cardCount === 0 && b.cardCount > 0) return 1;
		if (b.cardCount === 0 && a.cardCount > 0) return -1;
		return (b.avgEase ?? 0) - (a.avgEase ?? 0);
	});
	res.json(rows);
});

/**
 * @openapi
 * /api/decks/{id}:
 *   patch:
 *     summary: Update a deck — name, or marketplace share (isPublic, publicDescription)
 *     tags: [Decks]
 *     responses:
 *       200: { description: The updated deck }
 *       404: { description: Deck not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const { name, isPublic, publicDescription } = req.body as {
		name?: string;
		isPublic?: boolean;
		publicDescription?: string | null;
	};
	const data: {
		name?: string;
		isPublic?: boolean;
		publicDescription?: string | null;
		publishedAt?: Date | null;
	} = {};
	if (name !== undefined) data.name = name;
	if (publicDescription !== undefined)
		data.publicDescription = publicDescription;
	if (isPublic !== undefined) {
		data.isPublic = isPublic;
		data.publishedAt = isPublic ? new Date() : null;
	}

	// Members can't republish someone else's deck via their clone.
	if (isPublic === true || publicDescription !== undefined) {
		const owned = await prisma.deck.findFirst({
			where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
			select: { sharedFromDeckId: true },
		});
		if (owned && owned.sharedFromDeckId !== null) {
			return res
				.status(403)
				.json({ error: "Only the original owner can publish this deck" });
		}
	}

	const result = await prisma.deck.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Deck not found" });
	}
	const deck = await prisma.deck.findUnique({
		where: { id: String(req.params.id) },
	});
	res.json(deck);
});

/**
 * @openapi
 * /api/decks/{id}:
 *   delete:
 *     summary: Delete a deck and its cards
 *     tags: [Decks]
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Deck not found }
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const result = await prisma.deck.deleteMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Deck not found" });
	}
	res.status(204).end();
});

export default router;
