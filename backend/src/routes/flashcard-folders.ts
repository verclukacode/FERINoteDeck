import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * @openapi
 * tags:
 *   - name: FlashcardFolders
 *     description: Flashcard folders, scoped to the authenticated user
 */
const router = Router();

/**
 * @openapi
 * /api/flashcard-folders:
 *   get:
 *     summary: List the user's flashcard folders
 *     tags: [FlashcardFolders]
 *     responses:
 *       200: { description: Array of flashcard folders }
 */
router.get("/", async (req: Request, res: Response) => {
	const folders = await prisma.flashcardFolder.findMany({
		where: { userId: req.user?.uid ?? "" },
		orderBy: { order: "asc" },
	});
	res.json(folders);
});

/**
 * @openapi
 * /api/flashcard-folders:
 *   post:
 *     summary: Create a flashcard folder
 *     tags: [FlashcardFolders]
 *     responses:
 *       201: { description: The created folder }
 */
router.post("/", async (req: Request, res: Response) => {
	const { name, color } = req.body as { name?: string; color?: string };
	const order = await prisma.flashcardFolder.count({
		where: { userId: req.user?.uid ?? "" },
	});
	const folder = await prisma.flashcardFolder.create({
		data: {
			userId: req.user?.uid ?? "",
			name: (name ?? "").trim() || "New folder",
			color: color || "blue",
			order,
			collapsed: false,
		},
	});
	res.status(201).json(folder);
});

/**
 * @openapi
 * /api/flashcard-folders/{id}:
 *   patch:
 *     summary: Update a flashcard folder (name, color, collapsed)
 *     tags: [FlashcardFolders]
 *     responses:
 *       200: { description: The updated folder }
 *       404: { description: Folder not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const { name, color, collapsed } = req.body as {
		name?: string;
		color?: string;
		collapsed?: boolean;
	};
	const data: { name?: string; color?: string; collapsed?: boolean } = {};
	if (name !== undefined) data.name = name;
	if (color !== undefined) data.color = color;
	if (collapsed !== undefined) data.collapsed = collapsed;

	const result = await prisma.flashcardFolder.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Folder not found" });
	}
	const folder = await prisma.flashcardFolder.findUnique({
		where: { id: String(req.params.id) },
	});
	res.json(folder);
});

/**
 * @openapi
 * /api/flashcard-folders/{id}:
 *   delete:
 *     summary: Delete a flashcard folder and its decks/cards
 *     tags: [FlashcardFolders]
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Folder not found }
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const result = await prisma.flashcardFolder.deleteMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Folder not found" });
	}
	res.status(204).end();
});

export default router;
