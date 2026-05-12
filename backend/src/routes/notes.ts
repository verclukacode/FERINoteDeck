import { type Request, type Response, Router } from "express";

/**
 * @openapi
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Meeting notes
 *         content:
 *           type: string
 *           example: Discuss project milestones
 *         createdAt:
 *           type: string
 *           format: date-time
 *     NoteInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           example: Meeting notes
 *         content:
 *           type: string
 *           example: Discuss project milestones
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

interface Note {
	id: number;
	title: string;
	content: string;
	createdAt: string;
}

const router = Router();

const notes: Note[] = [];
let nextId = 1;

/**
 * @openapi
 * /api/notes:
 *   get:
 *     summary: List all notes
 *     tags: [Notes]
 *     responses:
 *       200:
 *         description: Array of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 */
router.get("/", (_req: Request, res: Response) => {
	res.json(notes);
});

/**
 * @openapi
 * /api/notes/{id}:
 *   get:
 *     summary: Get a note by ID
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", (req: Request, res: Response) => {
	const note = notes.find((n) => n.id === Number(req.params.id));
	if (!note) return res.status(404).json({ error: "Note not found" });
	res.json(note);
});

/**
 * @openapi
 * /api/notes:
 *   post:
 *     summary: Create a note
 *     tags: [Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteInput'
 *     responses:
 *       201:
 *         description: Created note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       400:
 *         description: Title is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", (req: Request, res: Response) => {
	const { title, content } = req.body as { title?: string; content?: string };
	if (!title) return res.status(400).json({ error: "Title is required" });
	const note: Note = {
		id: nextId++,
		title,
		content: content ?? "",
		createdAt: new Date().toISOString(),
	};
	notes.push(note);
	res.status(201).json(note);
});

/**
 * @openapi
 * /api/notes/{id}:
 *   put:
 *     summary: Update a note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteInput'
 *     responses:
 *       200:
 *         description: Updated note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", (req: Request, res: Response) => {
	const note = notes.find((n) => n.id === Number(req.params.id));
	if (!note) return res.status(404).json({ error: "Note not found" });
	const { title, content } = req.body as { title?: string; content?: string };
	if (title !== undefined) note.title = title;
	if (content !== undefined) note.content = content;
	res.json(note);
});

/**
 * @openapi
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", (req: Request, res: Response) => {
	const idx = notes.findIndex((n) => n.id === Number(req.params.id));
	if (idx === -1) return res.status(404).json({ error: "Note not found" });
	const [removed] = notes.splice(idx, 1);
	res.json(removed);
});

export default router;
