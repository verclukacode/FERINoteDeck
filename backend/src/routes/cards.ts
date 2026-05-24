import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

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
	res.json(cards);
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
	res.status(201).json(card);
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
	const card = await prisma.flashCard.findUnique({ where: { id: String(req.params.id) } });
	res.json(card);
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
