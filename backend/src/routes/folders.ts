import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * @openapi
 * tags:
 *   - name: Folders
 *     description: Note folders, scoped to the authenticated user
 */
const router = Router();

/**
 * @openapi
 * /api/folders:
 *   get:
 *     summary: List the user's folders
 *     tags: [Folders]
 *     responses:
 *       200: { description: Array of folders }
 *       401: { description: Missing or invalid token }
 */
router.get("/", async (req: Request, res: Response) => {
	const folders = await prisma.folder.findMany({
		where: { userId: req.user?.uid ?? "" },
		orderBy: { order: "asc" },
	});
	res.json(folders);
});

/**
 * @openapi
 * /api/folders:
 *   post:
 *     summary: Create a folder
 *     tags: [Folders]
 *     responses:
 *       201: { description: The created folder }
 */
router.post("/", async (req: Request, res: Response) => {
	const { name, color } = req.body as { name?: string; color?: string };
	const order = await prisma.folder.count({
		where: { userId: req.user?.uid ?? "" },
	});
	const folder = await prisma.folder.create({
		data: {
			userId: req.user?.uid ?? "",
			name: (name ?? "").trim() || "Untitled folder",
			color: color || "blue",
			order,
			collapsed: true,
		},
	});
	res.status(201).json(folder);
});

/**
 * @openapi
 * /api/folders/order:
 *   put:
 *     summary: Reorder folders
 *     tags: [Folders]
 *     responses:
 *       204: { description: Reordered }
 */
router.put("/order", async (req: Request, res: Response) => {
	const { orderedIds } = req.body as { orderedIds?: unknown };
	if (!Array.isArray(orderedIds)) {
		return res.status(400).json({ error: "orderedIds must be an array" });
	}
	await prisma.$transaction(
		orderedIds.map((id, order) =>
			prisma.folder.updateMany({
				where: { id: String(id), userId: req.user?.uid ?? "" },
				data: { order },
			}),
		),
	);
	res.status(204).end();
});

/**
 * @openapi
 * /api/folders/{id}:
 *   patch:
 *     summary: Update a folder (name, color, collapsed)
 *     tags: [Folders]
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

	const result = await prisma.folder.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Folder not found" });
	}
	const folder = await prisma.folder.findUnique({
		where: { id: String(req.params.id) },
	});
	res.json(folder);
});

/**
 * @openapi
 * /api/folders/{id}:
 *   delete:
 *     summary: Delete a folder and its pages
 *     tags: [Folders]
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Folder not found }
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const result = await prisma.folder.deleteMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Folder not found" });
	}
	res.status(204).end();
});

export default router;
