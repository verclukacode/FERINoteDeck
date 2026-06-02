import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";
import { serialize } from "../lib/serialize";
import { type Grade, schedule, settingsToScheduler } from "../lib/srs";
import {
	RESET_CARD_FIELDS,
	getOrCreateStudySettings,
} from "../lib/studySettings";

/**
 * @openapi
 * tags:
 *   - name: Cards
 *     description: Flashcards, scoped to the authenticated user
 */
const router = Router();

/**
 * @openapi
 * /api/cards:
 *   get:
 *     summary: List all of the user's flashcards
 *     tags: [Cards]
 *     responses:
 *       200: { description: Array of cards }
 */
router.get("/", async (req: Request, res: Response) => {
	const cards = await prisma.flashCard.findMany({
		where: { userId: req.user?.uid ?? "" },
		orderBy: { order: "asc" },
	});
	res.json(serialize(cards));
});

/**
 * @openapi
 * /api/cards:
 *   post:
 *     summary: Create a flashcard in a deck
 *     tags: [Cards]
 *     responses:
 *       201: { description: The created card }
 *       400: { description: Deck not found }
 */
router.post("/", async (req: Request, res: Response) => {
	const { deckId, type, question, answer } = req.body as {
		deckId?: string;
		type?: string;
		question?: string;
		answer?: string;
	};
	const deck = await prisma.deck.findFirst({
		where: { id: deckId, userId: req.user?.uid ?? "" },
	});
	if (!deck) {
		return res.status(400).json({ error: "Deck not found" });
	}
	const order = await prisma.flashCard.count({ where: { deckId } });
	const card = await prisma.flashCard.create({
		data: {
			userId: req.user?.uid ?? "",
			deckId: deck.id,
			type: type || "rate",
			question: question ?? "",
			answer: answer ?? "",
			order,
		},
	});
	res.status(201).json(serialize(card));
});

/**
 * @openapi
 * /api/cards/bulk:
 *   post:
 *     summary: Bulk-create flashcards in an existing deck (CSV/AI import)
 *     tags: [Cards]
 *     responses:
 *       201: { description: Array of created cards }
 *       400: { description: Bad request }
 *       404: { description: Deck not found }
 */
router.post("/bulk", async (req: Request, res: Response) => {
	const { deckId, cards } = req.body as {
		deckId?: string;
		cards?: Array<{ question?: string; answer?: string; type?: string }>;
	};
	const userId = req.user?.uid ?? "";
	const deck = await prisma.deck.findFirst({
		where: { id: deckId, userId },
		select: { id: true },
	});
	if (!deck) return res.status(404).json({ error: "Deck not found" });
	const incoming = Array.isArray(cards) ? cards : [];
	if (!incoming.length) {
		return res.status(400).json({ error: "cards array is required" });
	}

	const baseOrder = await prisma.flashCard.count({
		where: { deckId: deck.id },
	});
	await prisma.flashCard.createMany({
		data: incoming.map((c, i) => ({
			userId,
			deckId: deck.id,
			type: typeof c.type === "string" ? c.type : "rate",
			question: String(c.question ?? ""),
			answer: String(c.answer ?? ""),
			order: baseOrder + i,
		})),
	});
	// Return the new rows so the frontend can append to local state. Strip
	// BigInt scheduling fields — these are fresh "new" cards anyway.
	const created = await prisma.flashCard.findMany({
		where: { deckId: deck.id, order: { gte: baseOrder } },
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
	res.status(201).json(created);
});

/**
 * @openapi
 * /api/cards/{id}:
 *   patch:
 *     summary: Update a flashcard (type, question, answer)
 *     tags: [Cards]
 *     responses:
 *       200: { description: The updated card }
 *       404: { description: Card not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const { type, question, answer } = req.body as {
		type?: string;
		question?: string;
		answer?: string;
	};
	const data: { type?: string; question?: string; answer?: string } = {};
	if (type !== undefined) data.type = type;
	if (question !== undefined) data.question = question;
	if (answer !== undefined) data.answer = answer;

	const result = await prisma.flashCard.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Card not found" });
	}
	const card = await prisma.flashCard.findUnique({
		where: { id: String(req.params.id) },
	});
	res.json(serialize(card));
});

/**
 * @openapi
 * /api/cards/{id}/answer:
 *   post:
 *     summary: Grade a card in study (SM-2), persist scheduling + a revlog row
 *     tags: [Cards]
 *     responses:
 *       200: { description: The updated card }
 *       400: { description: Invalid grade }
 *       404: { description: Card not found }
 */
router.post("/:id/answer", async (req: Request, res: Response) => {
	const { grade, elapsedMs } = req.body as {
		grade?: number;
		elapsedMs?: number;
	};
	if (grade !== 1 && grade !== 2 && grade !== 3 && grade !== 4) {
		return res.status(400).json({ error: "grade must be 1, 2, 3 or 4" });
	}
	const userId = req.user?.uid ?? "";
	const card = await prisma.flashCard.findFirst({
		where: { id: String(req.params.id), userId },
	});
	if (!card) {
		return res.status(404).json({ error: "Card not found" });
	}

	const settings = await getOrCreateStudySettings(userId);
	const now = Date.now();
	const next = schedule(
		{
			state: card.state as "new" | "learning" | "review" | "relearning",
			intervalSec: Number(card.intervalSec),
			ease: card.ease,
			reps: card.reps,
			lapses: card.lapses,
			learningStep: card.learningStep,
		},
		grade as Grade,
		settingsToScheduler(settings),
		now,
	);

	const [updated] = await prisma.$transaction([
		prisma.flashCard.update({
			where: { id: card.id },
			data: {
				state: next.state,
				due: BigInt(next.due),
				intervalSec: BigInt(next.intervalSec),
				ease: next.ease,
				reps: next.reps,
				lapses: next.lapses,
				learningStep: next.learningStep,
				lastReviewedAt: BigInt(now),
			},
		}),
		prisma.review.create({
			data: {
				userId,
				cardId: card.id,
				deckId: card.deckId,
				reviewedAt: BigInt(now),
				grade,
				prevState: card.state,
				newState: next.state,
				prevIntervalSec: card.intervalSec,
				newIntervalSec: BigInt(next.intervalSec),
				prevEase: card.ease,
				newEase: next.ease,
				prevDue: card.due,
				newDue: BigInt(next.due),
				elapsedMs: typeof elapsedMs === "number" ? Math.round(elapsedMs) : null,
			},
		}),
	]);

	res.json(serialize(updated));
});

/**
 * @openapi
 * /api/cards/{id}/reset:
 *   post:
 *     summary: Reset a card's study progress back to new (keeps revlog)
 *     tags: [Cards]
 *     responses:
 *       200: { description: The reset card }
 *       404: { description: Card not found }
 */
router.post("/:id/reset", async (req: Request, res: Response) => {
	const result = await prisma.flashCard.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data: RESET_CARD_FIELDS,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Card not found" });
	}
	const card = await prisma.flashCard.findUnique({
		where: { id: String(req.params.id) },
	});
	res.json(serialize(card));
});

/**
 * @openapi
 * /api/cards/{id}:
 *   delete:
 *     summary: Delete a flashcard
 *     tags: [Cards]
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Card not found }
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const result = await prisma.flashCard.deleteMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Card not found" });
	}
	res.status(204).end();
});

export default router;
