import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * @openapi
 * tags:
 *   - name: CalendarEvents
 *     description: Exam/test/event calendar items, scoped to the authenticated user
 */
const router = Router();

/**
 * @openapi
 * /api/calendar-events:
 *   get:
 *     summary: List the user's calendar events (optionally filtered by date range)
 *     tags: [CalendarEvents]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: ISO date — return events on or after this date
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: ISO date — return events on or before this date
 *     responses:
 *       200: { description: Array of calendar events with tag included }
 *       401: { description: Missing or invalid token }
 */
router.get("/", async (req: Request, res: Response) => {
	const { from, to } = req.query as { from?: string; to?: string };
	const dateFilter: { gte?: Date; lte?: Date } = {};
	if (from) dateFilter.gte = new Date(from);
	if (to) dateFilter.lte = new Date(to);

	const events = await prisma.calendarEvent.findMany({
		where: {
			userId: req.user?.uid ?? "",
			...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
		},
		include: { tag: true },
		orderBy: { date: "asc" },
	});
	res.json(events);
});

/**
 * @openapi
 * /api/calendar-events/upcoming:
 *   get:
 *     summary: Get events within the next 3 days split into warning (≤3 days) and urgent (≤1 day) buckets
 *     tags: [CalendarEvents]
 *     responses:
 *       200:
 *         description: "{ warning: CalendarEvent[], urgent: CalendarEvent[] }"
 *       401: { description: Missing or invalid token }
 */
router.get("/upcoming", async (req: Request, res: Response) => {
	const now = new Date();
	const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

	const events = await prisma.calendarEvent.findMany({
		where: {
			userId: req.user?.uid ?? "",
			date: { gte: now, lte: in3Days },
		},
		include: { tag: true },
		orderBy: { date: "asc" },
	});

	const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
	const urgent = events.filter((e) => e.date <= in1Day);
	const warning = events.filter((e) => e.date > in1Day);

	res.json({ warning, urgent });
});

/**
 * @openapi
 * /api/calendar-events:
 *   post:
 *     summary: Create a calendar event
 *     tags: [CalendarEvents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               date: { type: string, format: date-time }
 *               tagId: { type: string }
 *     responses:
 *       201: { description: The created event with tag included }
 */
router.post("/", async (req: Request, res: Response) => {
	const { name, description, date, tagId } = req.body as {
		name?: string;
		description?: string;
		date?: string;
		tagId?: string;
	};
	if (!name?.trim()) {
		return res.status(400).json({ error: "name is required" });
	}
	if (!date) {
		return res.status(400).json({ error: "date is required" });
	}
	const parsedDate = new Date(date);
	if (Number.isNaN(parsedDate.getTime())) {
		return res.status(400).json({ error: "date must be a valid ISO date" });
	}

	// If tagId is provided, verify it belongs to this user
	if (tagId) {
		const tag = await prisma.calendarTag.findFirst({
			where: { id: tagId, userId: req.user?.uid ?? "" },
		});
		if (!tag) {
			return res.status(400).json({ error: "Tag not found" });
		}
	}

	const event = await prisma.calendarEvent.create({
		data: {
			userId: req.user?.uid ?? "",
			name: name.trim(),
			description: description?.trim() || null,
			date: parsedDate,
			tagId: tagId || null,
		},
		include: { tag: true },
	});
	res.status(201).json(event);
});

/**
 * @openapi
 * /api/calendar-events/{id}:
 *   patch:
 *     summary: Update a calendar event
 *     tags: [CalendarEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The updated event with tag included }
 *       404: { description: Event not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const { name, description, date, tagId } = req.body as {
		name?: string;
		description?: string;
		date?: string;
		tagId?: string | null;
	};

	const data: {
		name?: string;
		description?: string | null;
		date?: Date;
		tagId?: string | null;
	} = {};

	if (name !== undefined) data.name = name.trim();
	if (description !== undefined) data.description = description?.trim() || null;
	if (date !== undefined) {
		const parsed = new Date(date);
		if (Number.isNaN(parsed.getTime())) {
			return res.status(400).json({ error: "date must be a valid ISO date" });
		}
		data.date = parsed;
	}
	if (tagId !== undefined) {
		if (tagId === null) {
			data.tagId = null;
		} else {
			const tag = await prisma.calendarTag.findFirst({
				where: { id: tagId, userId: req.user?.uid ?? "" },
			});
			if (!tag) {
				return res.status(400).json({ error: "Tag not found" });
			}
			data.tagId = tagId;
		}
	}

	const result = await prisma.calendarEvent.updateMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Event not found" });
	}
	const event = await prisma.calendarEvent.findUnique({
		where: { id: String(req.params.id) },
		include: { tag: true },
	});
	res.json(event);
});

/**
 * @openapi
 * /api/calendar-events/{id}:
 *   delete:
 *     summary: Delete a calendar event
 *     tags: [CalendarEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Event not found }
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const result = await prisma.calendarEvent.deleteMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Event not found" });
	}
	res.status(204).end();
});

export default router;
