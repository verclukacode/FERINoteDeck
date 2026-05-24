import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

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
	const decks = await prisma.deck.findMany({
		where: { userId: req.user?.uid ?? "" },
		orderBy: { order: "asc" },
	});
	res.json(decks);
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
	const { folderId, name } = req.body as { folderId?: string; name?: string };
	const folder = await prisma.flashcardFolder.findFirst({
		where: { id: folderId, userId: req.user?.uid ?? "" },
	});
	if (!folder) {
		return res.status(400).json({ error: "Folder not found" });
	}
	const order = await prisma.deck.count({ where: { folderId } });
	const deck = await prisma.deck.create({
		data: {
			userId: req.user?.uid ?? "",
			folderId: folder.id,
			name: (name ?? "").trim() || "New deck",
			order,
		},
	});
	res.status(201).json(deck);
});

/**
 * @openapi
 * /api/decks/{id}:
 *   patch:
 *     summary: Rename a deck
 *     tags: [Decks]
 *     responses:
 *       200: { description: The updated deck }
 *       404: { description: Deck not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const { name } = req.body as { name?: string };
	const data: { name?: string } = {};
	if (name !== undefined) data.name = name;

	const result = await prisma.deck.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Deck not found" });
	}
	const deck = await prisma.deck.findUnique({ where: { id: String(req.params.id) } });
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
