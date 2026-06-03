import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * @openapi
 * tags:
 *   - name: Search
 *     description: Cross-feature search across the caller's notes, decks and cards
 */
const router = Router();

const MAX_RESULTS = 30;
const PER_KIND_FETCH = 50;
const SNIPPET_WIDTH = 100;
const MAX_QUERY_LEN = 200;

// Score a single matched field. Earlier matches, prefix matches and exact
// matches all rank higher than a generic substring hit.
export function scoreField(
	field: string | null | undefined,
	term: string,
): number {
	if (!field) return 0;
	const f = field.toLowerCase();
	const i = f.indexOf(term);
	if (i < 0) return 0;
	if (f === term) return 1000;
	if (i === 0) return 500;
	return Math.max(10, 100 - i);
}

// Return a ~100-char window around the first occurrence of `term`.
export function snippet(text: string | null | undefined, term: string): string {
	if (!text) return "";
	const f = text.toLowerCase();
	const i = f.indexOf(term);
	if (i < 0) return text.slice(0, SNIPPET_WIDTH).replace(/\s+/g, " ").trim();
	const start = Math.max(0, i - Math.floor(SNIPPET_WIDTH / 3));
	const end = Math.min(text.length, start + SNIPPET_WIDTH);
	let s = text.slice(start, end).replace(/\s+/g, " ").trim();
	if (start > 0) s = `…${s}`;
	if (end < text.length) s = `${s}…`;
	return s;
}

type Kind = "note" | "deck" | "card";
interface Result {
	kind: Kind;
	id: string;
	title: string;
	subtitle: string;
	// For notes/decks: their own folderId. For cards: the parent deck's folderId
	// (so the client can expand the right sidebar folder when jumping there).
	folderId?: string;
	// For cards only: the parent deck's id (so the client can select the deck).
	deckId?: string;
	score: number;
}

/**
 * @openapi
 * /api/search:
 *   get:
 *     summary: Search the caller's notes, decks, and cards (mixed, relevance-sorted)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ items: Result[] }" }
 *       400: { description: query too long }
 */
router.get("/", async (req: Request, res: Response) => {
	const userId = req.user?.uid ?? "";
	const raw = String(req.query.q ?? "").trim();
	if (!raw) return res.json({ items: [] });
	if (raw.length > MAX_QUERY_LEN) {
		return res.status(400).json({ error: "Query too long" });
	}
	const term = raw.toLowerCase();

	const [pages, decks, cards, sharedInvites] = await Promise.all([
		prisma.page.findMany({
			where: {
				userId,
				OR: [{ title: { contains: raw } }, { content: { contains: raw } }],
			},
			select: { id: true, title: true, content: true, folderId: true },
			orderBy: { updatedAt: "desc" },
			take: PER_KIND_FETCH,
		}),
		prisma.deck.findMany({
			where: { userId, name: { contains: raw } },
			select: { id: true, name: true, folderId: true },
			orderBy: { updatedAt: "desc" },
			take: PER_KIND_FETCH,
		}),
		// `select:` instead of `include:` so the BigInt scheduling fields stay out
		// of the response (they'd crash `res.json` via serialization).
		prisma.flashCard.findMany({
			where: {
				userId,
				OR: [{ question: { contains: raw } }, { answer: { contains: raw } }],
			},
			select: {
				id: true,
				deckId: true,
				question: true,
				answer: true,
				deck: { select: { folderId: true } },
			},
			orderBy: { updatedAt: "desc" },
			take: PER_KIND_FETCH,
		}),
		prisma.noteInvite.findMany({
			where: {
				recipientId: userId,
				status: "accepted",
				page: {
					OR: [{ title: { contains: raw } }, { content: { contains: raw } }],
				},
			},
			select: {
				page: { select: { id: true, title: true, content: true } },
			},
			take: PER_KIND_FETCH,
		}),
	]);

	const results: Result[] = [];

	for (const p of pages) {
		const titleScore = scoreField(p.title, term) * 5;
		const contentScore = scoreField(p.content, term);
		const score = titleScore + contentScore;
		if (!score) continue;
		results.push({
			kind: "note",
			id: p.id,
			title: p.title,
			subtitle: contentScore > 0 ? snippet(p.content, term) : "",
			folderId: p.folderId,
			score,
		});
	}

	for (const inv of sharedInvites) {
		const p = inv.page;
		const titleScore = scoreField(p.title, term) * 5;
		const contentScore = scoreField(p.content, term);
		const score = titleScore + contentScore;
		if (!score) continue;
		results.push({
			kind: "note",
			id: p.id,
			title: p.title,
			subtitle: contentScore > 0 ? snippet(p.content, term) : "",
			score,
		});
	}

	for (const d of decks) {
		const score = scoreField(d.name, term) * 5;
		if (!score) continue;
		results.push({
			kind: "deck",
			id: d.id,
			title: d.name,
			subtitle: "",
			folderId: d.folderId,
			score,
		});
	}

	for (const c of cards) {
		const qScore = scoreField(c.question, term) * 3;
		const aScore = scoreField(c.answer, term);
		const score = qScore + aScore;
		if (!score) continue;
		// Pick a snippet from whichever field the user is most likely interested
		// in: prefer a question hit since that's the card's "title".
		const sn = qScore > 0 ? snippet(c.question, term) : snippet(c.answer, term);
		results.push({
			kind: "card",
			id: c.id,
			title: c.question || "(no question)",
			subtitle: sn,
			deckId: c.deckId,
			folderId: c.deck?.folderId,
			score,
		});
	}

	results.sort((a, b) => b.score - a.score);
	res.json({ items: results.slice(0, MAX_RESULTS) });
});

export default router;
