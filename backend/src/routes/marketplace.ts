import { type Request, type Response, Router } from "express";
import { cloneDeckForUser } from "../lib/cloneDeck";
import { prisma } from "../lib/prisma";

/**
 * @openapi
 * tags:
 *   - name: Marketplace
 *     description: Public notes and flashcard decks shared by other users
 */
const router = Router();

const AUTHOR_SELECT = { username: true, avatarUrl: true } as const;
const PAGE_LIMIT_MAX = 50;

/**
 * @openapi
 * /api/marketplace:
 *   get:
 *     summary: Browse public notes and decks (with optional search + kind filter)
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: kind
 *         schema: { type: string, enum: [all, note, deck] }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: "{ items, hasMore }" }
 */
router.get("/", async (req: Request, res: Response) => {
	const q = String(req.query.q ?? "").trim();
	const kind = String(req.query.kind ?? "all");
	const offset = Math.max(0, Number(req.query.offset ?? 0));
	const limit = Math.min(
		PAGE_LIMIT_MAX,
		Math.max(1, Number(req.query.limit ?? 20)),
	);
	const take = offset + limit + 1; // over-fetch to detect hasMore after merge

	const pageWhere = {
		isPublic: true,
		...(q
			? {
					OR: [
						{ title: { contains: q } },
						{ publicDescription: { contains: q } },
						{ user: { username: { contains: q } } },
					],
				}
			: {}),
	};
	const deckWhere = {
		isPublic: true,
		...(q
			? {
					OR: [
						{ name: { contains: q } },
						{ publicDescription: { contains: q } },
						{ user: { username: { contains: q } } },
					],
				}
			: {}),
	};

	const [pages, decks] = await Promise.all([
		kind === "deck"
			? Promise.resolve([])
			: prisma.page.findMany({
					where: pageWhere,
					orderBy: { publishedAt: "desc" },
					take,
					select: {
						id: true,
						title: true,
						publicDescription: true,
						publishedAt: true,
						user: { select: AUTHOR_SELECT },
					},
				}),
		kind === "note"
			? Promise.resolve([])
			: prisma.deck.findMany({
					where: deckWhere,
					orderBy: { publishedAt: "desc" },
					take,
					select: {
						id: true,
						name: true,
						publicDescription: true,
						publishedAt: true,
						user: { select: AUTHOR_SELECT },
					},
				}),
	]);

	type Item = {
		kind: "note" | "deck";
		id: string;
		title: string;
		publicDescription: string | null;
		publishedAt: Date | null;
		author: { username: string | null; avatarUrl: string | null };
	};
	const merged: Item[] = [
		...pages.map(
			(p): Item => ({
				kind: "note",
				id: p.id,
				title: p.title,
				publicDescription: p.publicDescription,
				publishedAt: p.publishedAt,
				author: p.user,
			}),
		),
		...decks.map(
			(d): Item => ({
				kind: "deck",
				id: d.id,
				title: d.name,
				publicDescription: d.publicDescription,
				publishedAt: d.publishedAt,
				author: d.user,
			}),
		),
	].sort(
		(a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
	);

	const slice = merged.slice(offset, offset + limit);
	const hasMore = merged.length > offset + limit;
	res.json({ items: slice, hasMore });
});

/**
 * @openapi
 * /api/marketplace/notes/{id}:
 *   get:
 *     summary: Read a public note (full content + author)
 *     tags: [Marketplace]
 *     responses:
 *       200: { description: The note }
 *       404: { description: Not found or not public }
 */
router.get("/notes/:id", async (req: Request, res: Response) => {
	const page = await prisma.page.findFirst({
		where: { id: String(req.params.id), isPublic: true },
		select: {
			id: true,
			title: true,
			content: true,
			publicDescription: true,
			publishedAt: true,
			user: { select: AUTHOR_SELECT },
		},
	});
	if (!page) return res.status(404).json({ error: "Not found" });
	const { user, ...rest } = page;
	res.json({ ...rest, author: user });
});

/**
 * @openapi
 * /api/marketplace/decks/{id}:
 *   get:
 *     summary: Read a public deck with its cards (read-only preview)
 *     tags: [Marketplace]
 *     responses:
 *       200: { description: The deck + cards }
 *       404: { description: Not found or not public }
 */
router.get("/decks/:id", async (req: Request, res: Response) => {
	const deck = await prisma.deck.findFirst({
		where: { id: String(req.params.id), isPublic: true },
		// IMPORTANT: select only non-BigInt card fields. `include: { cards: true }`
		// would pull in scheduling BigInts and crash res.json on serialization.
		select: {
			id: true,
			name: true,
			publicDescription: true,
			publishedAt: true,
			user: { select: AUTHOR_SELECT },
			cards: {
				select: {
					id: true,
					type: true,
					question: true,
					answer: true,
					order: true,
				},
				orderBy: { order: "asc" },
			},
		},
	});
	if (!deck) return res.status(404).json({ error: "Not found" });
	const { user, ...rest } = deck;
	res.json({ ...rest, author: user });
});

/**
 * @openapi
 * /api/marketplace/notes/{id}/clone:
 *   post:
 *     summary: Clone a public note into the caller's account
 *     tags: [Marketplace]
 *     responses:
 *       201: { description: The cloned page }
 *       400: { description: Folder not found }
 *       404: { description: Source not found or not public }
 */
router.post("/notes/:id/clone", async (req: Request, res: Response) => {
	const userId = req.user?.uid ?? "";
	const folderId = String(req.body?.folderId ?? "");
	const source = await prisma.page.findFirst({
		where: { id: String(req.params.id), isPublic: true },
	});
	if (!source) return res.status(404).json({ error: "Source not found" });
	const folder = await prisma.folder.findFirst({
		where: { id: folderId, userId },
	});
	if (!folder) return res.status(400).json({ error: "Folder not found" });
	const order = await prisma.page.count({ where: { folderId } });
	const page = await prisma.page.create({
		data: {
			userId,
			folderId,
			title: source.title,
			content: source.content,
			order,
			isPublic: false,
			publicDescription: null,
			publishedAt: null,
		},
	});
	res.status(201).json(page);
});

/**
 * @openapi
 * /api/marketplace/decks/{id}/clone:
 *   post:
 *     summary: Clone a public deck (+ its cards) into the caller's account
 *     tags: [Marketplace]
 *     responses:
 *       201: { description: "{ deck, cards }" }
 *       400: { description: Folder not found }
 *       404: { description: Source not found or not public }
 */
router.post("/decks/:id/clone", async (req: Request, res: Response) => {
	const userId = req.user?.uid ?? "";
	const folderId = String(req.body?.folderId ?? "");
	const source = await prisma.deck.findFirst({
		where: { id: String(req.params.id), isPublic: true },
		select: { id: true },
	});
	if (!source) return res.status(404).json({ error: "Source not found" });
	const folder = await prisma.flashcardFolder.findFirst({
		where: { id: folderId, userId },
	});
	if (!folder) return res.status(400).json({ error: "Folder not found" });

	const result = await prisma.$transaction((tx) =>
		cloneDeckForUser(tx, {
			sourceDeckId: source.id,
			recipientUserId: userId,
			targetFolderId: folderId,
			sharedFromDeckId: null,
		}),
	);
	res.status(201).json(result);
});

export default router;
