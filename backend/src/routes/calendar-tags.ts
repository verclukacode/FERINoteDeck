import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * @openapi
 * tags:
 *   - name: CalendarTags
 *     description: User-defined tags for calendar events (name + color)
 */
const router = Router();

/**
 * @openapi
 * /api/calendar-tags:
 *   get:
 *     summary: List the user's calendar tags
 *     tags: [CalendarTags]
 *     responses:
 *       200: { description: Array of calendar tags }
 *       401: { description: Missing or invalid token }
 */
router.get("/", async (req: Request, res: Response) => {
	const tags = await prisma.calendarTag.findMany({
		where: { userId: req.user?.uid ?? "" },
		orderBy: { createdAt: "asc" },
	});
	res.json(tags);
});

/**
 * @openapi
 * /api/calendar-tags:
 *   post:
 *     summary: Create a calendar tag
 *     tags: [CalendarTags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               color: { type: string }
 *     responses:
 *       201: { description: The created tag }
 */
router.post("/", async (req: Request, res: Response) => {
	const { name, color } = req.body as { name?: string; color?: string };
	if (!name?.trim()) {
		return res.status(400).json({ error: "name is required" });
	}
	const tag = await prisma.calendarTag.create({
		data: {
			userId: req.user?.uid ?? "",
			name: name.trim(),
			color: color || "blue",
		},
	});
	res.status(201).json(tag);
});

/**
 * @openapi
 * /api/calendar-tags/{id}:
 *   patch:
 *     summary: Update a calendar tag (name, color)
 *     tags: [CalendarTags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The updated tag }
 *       404: { description: Tag not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const { name, color } = req.body as { name?: string; color?: string };
	const data: { name?: string; color?: string } = {};
	if (name !== undefined) data.name = name.trim();
	if (color !== undefined) data.color = color;

	const result = await prisma.calendarTag.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Tag not found" });
	}
	const tag = await prisma.calendarTag.findUnique({
		where: { id: String(req.params.id) },
	});
	res.json(tag);
});

/**
 * @openapi
 * /api/calendar-tags/{id}:
 *   delete:
 *     summary: Delete a calendar tag (affected events have tagId set to null)
 *     tags: [CalendarTags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Tag not found }
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const result = await prisma.calendarTag.deleteMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Tag not found" });
	}
	res.status(204).end();
});

export default router;
