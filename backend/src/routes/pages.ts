import { type Request, type Response, Router } from "express";
import { extractImageUrls, isAllowedImageUrl } from "../lib/imageValidation";
import {
	type ChatMessage,
	chatAboutNoteStream,
	generateFlashcardsFromNote,
} from "../lib/openai";
import { prisma } from "../lib/prisma";

// In-memory presence: pageId → userId → { username, avatarUrl, lastSeen }
const presence = new Map<
	string,
	Map<string, { username: string; avatarUrl: string | null; lastSeen: number }>
>();
const PRESENCE_TTL = 12_000; // 12s — clients ping every 5s

function getViewers(pageId: string) {
	const now = Date.now();
	const page = presence.get(pageId);
	if (!page) return [];
	for (const [uid, data] of page) {
		if (now - data.lastSeen > PRESENCE_TTL) page.delete(uid);
	}
	return Array.from(page.values());
}

/**
 * @openapi
 * tags:
 *   - name: Pages
 *     description: Note pages, scoped to the authenticated user
 */
const router = Router();

/**
 * @openapi
 * /api/pages:
 *   get:
 *     summary: List all of the user's pages
 *     tags: [Pages]
 *     responses:
 *       200: { description: Array of pages }
 */
router.get("/", async (req: Request, res: Response) => {
	const pages = await prisma.page.findMany({
		where: { userId: req.user?.uid ?? "" },
		orderBy: { order: "asc" },
	});
	res.json(pages);
});

/**
 * @openapi
 * /api/pages:
 *   post:
 *     summary: Create a page in a folder
 *     tags: [Pages]
 *     responses:
 *       201: { description: The created page }
 *       400: { description: Folder not found }
 */
router.post("/", async (req: Request, res: Response) => {
	const { folderId, title, content } = req.body as {
		folderId?: string;
		title?: string;
		content?: string;
	};
	const folder = await prisma.folder.findFirst({
		where: { id: folderId, userId: req.user?.uid ?? "" },
	});
	if (!folder) {
		return res.status(400).json({ error: "Folder not found" });
	}
	const order = await prisma.page.count({ where: { folderId } });
	const page = await prisma.page.create({
		data: {
			userId: req.user?.uid ?? "",
			folderId: folder.id,
			title: (title ?? "").trim() || "Untitled page",
			content:
				typeof content === "string" && content.length > 0
					? content
					: "Nothing here yet, tap to edit.",
			order,
		},
	});
	res.status(201).json(page);
});

/**
 * @openapi
 * /api/pages/order:
 *   put:
 *     summary: Bulk-save page order and folder membership (after drag-and-drop)
 *     tags: [Pages]
 *     responses:
 *       204: { description: Saved }
 *       400: { description: Unknown folder referenced }
 */
router.put("/order", async (req: Request, res: Response) => {
	const { pages } = req.body as {
		pages?: Array<{ id: string; folderId: string; order: number }>;
	};
	if (!Array.isArray(pages)) {
		return res.status(400).json({ error: "pages must be an array" });
	}
	const folderIds = [...new Set(pages.map((p) => p.folderId))];
	const owned = await prisma.folder.findMany({
		where: { id: { in: folderIds }, userId: req.user?.uid ?? "" },
		select: { id: true },
	});
	if (owned.length !== folderIds.length) {
		return res.status(400).json({ error: "Unknown folder referenced" });
	}
	await prisma.$transaction(
		pages.map((p) =>
			prisma.page.updateMany({
				where: { id: p.id, userId: req.user?.uid ?? "" },
				data: { folderId: p.folderId, order: p.order },
			}),
		),
	);
	res.status(204).end();
});

/**
 * @openapi
 * /api/pages/shared:
 *   get:
 *     summary: List pages shared with the current user (accepted invites)
 *     tags: [Pages]
 *     responses:
 *       200: { description: Array of shared pages with owner info }
 */
router.get("/shared", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";

	const invites = await prisma.noteInvite.findMany({
		where: { recipientId: uid, status: "accepted" },
		include: {
			page: true,
			sender: { select: { username: true, avatarUrl: true, email: true } },
		},
	});

	const pages = invites.map((inv) => ({
		...inv.page,
		_shared: true,
		_owner: inv.sender,
		_inviteId: inv.id,
	}));

	res.json(pages);
});

/**
 * @openapi
 * /api/pages/{id}:
 *   get:
 *     summary: Get a single page
 *     tags: [Pages]
 *     responses:
 *       200: { description: The page }
 *       404: { description: Page not found }
 */
// POST /api/pages/:id/presence — heartbeat (user is viewing this page)
router.post("/:id/presence", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";
	const pageId = String(req.params.id);

	const me = await prisma.user.findUnique({
		where: { id: uid },
		select: { username: true, avatarUrl: true },
	});

	if (!presence.has(pageId)) presence.set(pageId, new Map());
	presence.get(pageId)?.set(uid, {
		username: me?.username ?? uid,
		avatarUrl: me?.avatarUrl ?? null,
		lastSeen: Date.now(),
	});

	res.status(204).end();
});

// GET /api/pages/:id/presence — who's currently viewing (excluding caller)
router.get("/:id/presence", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";
	const pageId = String(req.params.id);
	const viewers = getViewers(pageId).filter(
		(v) => v.username !== presence.get(pageId)?.get(uid)?.username,
	);
	res.json(viewers);
});

/**
 * @openapi
 * /api/pages/{id}/generate-deck:
 *   post:
 *     summary: Generate a flashcard deck from this note (AI, tier-gated)
 *     tags: [Pages]
 *     responses:
 *       200: { description: "{ title, cards } — preview, not saved yet" }
 *       403: { description: Tier check failed (basic) }
 *       404: { description: Page not found or no access }
 *       503: { description: OPENAI_API_KEY not set }
 */
router.post("/:id/generate-deck", async (req: Request, res: Response) => {
	if (!process.env.OPENAI_API_KEY) {
		return res
			.status(503)
			.json({ error: "AI generation not configured on this server" });
	}
	const uid = req.user?.uid ?? "";
	const account = await prisma.user.findUnique({
		where: { id: uid },
		select: { tier: true },
	});
	if (!account || account.tier === "basic") {
		return res.status(403).json({
			error: "AI generation requires a Pro or Premium account",
		});
	}

	// Owner OR accepted-invite collaborator can generate a deck from a note.
	const pageId = String(req.params.id);
	const page = await prisma.page.findFirst({
		where: {
			id: pageId,
			OR: [
				{ userId: uid },
				{ invites: { some: { recipientId: uid, status: "accepted" } } },
			],
		},
		select: { id: true, title: true, content: true },
	});
	if (!page) return res.status(404).json({ error: "Page not found" });

	try {
		const cards = await generateFlashcardsFromNote(page.title, page.content);
		res.json({ title: page.title, cards });
	} catch (err) {
		console.error("generate-deck failed", err);
		res.status(500).json({ error: "Deck generation failed" });
	}
});

const CHAT_MAX_MESSAGES = 40;
const CHAT_MAX_CHARS = 4000;
const SENTINEL = "<<<NoteDeckMD>>>";

/**
 * @openapi
 * /api/pages/{id}/chat:
 *   post:
 *     summary: Chat with OpenAI grounded in this note's content (tier-gated)
 *     tags: [Pages]
 *     responses:
 *       200: { description: "{ reply }" }
 *       400: { description: Bad request (message shape, length) }
 *       403: { description: Tier check failed (basic) }
 *       404: { description: Page not found or no access }
 *       503: { description: OPENAI_API_KEY not set }
 */
router.post("/:id/chat", async (req: Request, res: Response) => {
	if (!process.env.OPENAI_API_KEY) {
		return res
			.status(503)
			.json({ error: "AI chat not configured on this server" });
	}
	const uid = req.user?.uid ?? "";
	const account = await prisma.user.findUnique({
		where: { id: uid },
		select: { tier: true },
	});
	if (!account || account.tier === "basic") {
		return res
			.status(403)
			.json({ error: "AI chat requires a Pro or Premium account" });
	}

	const pageId = String(req.params.id);
	const page = await prisma.page.findFirst({
		where: {
			id: pageId,
			OR: [
				{ userId: uid },
				{ invites: { some: { recipientId: uid, status: "accepted" } } },
			],
		},
		select: { id: true, title: true, content: true },
	});
	if (!page) return res.status(404).json({ error: "Page not found" });

	const raw = (req.body as { messages?: unknown }).messages;
	if (!Array.isArray(raw)) {
		return res.status(400).json({ error: "messages must be an array" });
	}
	if (raw.length === 0) {
		return res.status(400).json({ error: "messages cannot be empty" });
	}
	if (raw.length > CHAT_MAX_MESSAGES) {
		return res.status(400).json({
			error: `Conversation limit reached (${CHAT_MAX_MESSAGES} turns)`,
		});
	}
	const messages: ChatMessage[] = [];
	for (const m of raw) {
		if (
			!m ||
			typeof m !== "object" ||
			((m as { role?: unknown }).role !== "user" &&
				(m as { role?: unknown }).role !== "assistant")
		) {
			return res
				.status(400)
				.json({ error: "Each message must have role user or assistant" });
		}
		const content = String((m as { content?: unknown }).content ?? "");
		if (!content.trim()) {
			return res.status(400).json({ error: "Message content cannot be empty" });
		}
		if (content.length > CHAT_MAX_CHARS) {
			return res.status(400).json({
				error: `Message exceeds ${CHAT_MAX_CHARS} characters`,
			});
		}
		messages.push({
			role: (m as { role: "user" | "assistant" }).role,
			content,
		});
	}

	const strippedContent = page.content.split(SENTINEL).join("").trim();

	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	res.setHeader("Cache-Control", "no-cache, no-transform");
	res.setHeader("X-Accel-Buffering", "no");
	res.flushHeaders();

	try {
		for await (const delta of chatAboutNoteStream(
			page.title,
			strippedContent,
			messages,
		)) {
			res.write(delta);
		}
		res.end();
	} catch (err) {
		console.error("chat failed", err);
		if (!res.headersSent) {
			res.status(500).json({ error: "Chat reply failed" });
		} else {
			res.end();
		}
	}
});

router.get("/:id", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";
	const pageId = String(req.params.id);

	// Own page or shared via accepted invite
	const page = await prisma.page.findFirst({
		where: {
			id: pageId,
			OR: [
				{ userId: uid },
				{ invites: { some: { recipientId: uid, status: "accepted" } } },
			],
		},
	});
	if (!page) {
		return res.status(404).json({ error: "Page not found" });
	}
	res.json(page);
});

/**
 * @openapi
 * /api/pages/{id}:
 *   patch:
 *     summary: Update a page — title, content, or marketplace share (isPublic, publicDescription)
 *     tags: [Pages]
 *     responses:
 *       200: { description: The updated page }
 *       404: { description: Page not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const { title, content, isPublic, publicDescription } = req.body as {
		title?: string;
		content?: string;
		isPublic?: boolean;
		publicDescription?: string | null;
	};
	const data: {
		title?: string;
		content?: string;
		isPublic?: boolean;
		publicDescription?: string | null;
		publishedAt?: Date | null;
	} = {};
	if (title !== undefined) data.title = title;
	if (content !== undefined) data.content = content;
	if (publicDescription !== undefined)
		data.publicDescription = publicDescription;
	if (isPublic !== undefined) {
		data.isPublic = isPublic;
		data.publishedAt = isPublic ? new Date() : null;
	}

	const uid = req.user?.uid ?? "";
	const pageId = String(req.params.id);

	// Allow edit if owner OR has accepted invite (collaboration).
	// Shared editors cannot change marketplace fields — only owner can.
	const isOwner = await prisma.page.findFirst({
		where: { id: pageId, userId: uid },
		select: { id: true },
	});
	if (!isOwner) {
		const invite = await prisma.noteInvite.findFirst({
			where: { pageId, recipientId: uid, status: "accepted" },
		});
		if (!invite) {
			return res.status(404).json({ error: "Page not found" });
		}
		// Collaborators can only edit title and content
		const collabData: { title?: string; content?: string } = {};
		if (title !== undefined) collabData.title = title;
		if (content !== undefined) collabData.content = content;
		await prisma.page.update({ where: { id: pageId }, data: collabData });
		const page = await prisma.page.findUnique({ where: { id: pageId } });
		return res.json(page);
	}

	// If this update will leave the note in the public marketplace, ensure no
	// `![](url)` block points at an external host. External image URLs in
	// public notes are read by every previewer and act as web beacons
	// (IP / user-agent tracking, no JS needed).
	const existing = await prisma.page.findUnique({
		where: { id: pageId },
		select: { isPublic: true, content: true },
	});
	const willBePublic = data.isPublic ?? existing?.isPublic ?? false;
	const finalContent = data.content ?? existing?.content ?? "";
	if (willBePublic) {
		for (const url of extractImageUrls(finalContent)) {
			if (!isAllowedImageUrl(url)) {
				return res.status(400).json({
					error:
						"Public notes can't contain external images — upload them first.",
				});
			}
		}
	}

	const result = await prisma.page.updateMany({
		where: { id: pageId, userId: uid },
		data,
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Page not found" });
	}
	const page = await prisma.page.findUnique({ where: { id: pageId } });
	res.json(page);
});

/**
 * @openapi
 * /api/pages/{id}:
 *   delete:
 *     summary: Delete a page
 *     tags: [Pages]
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Page not found }
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const result = await prisma.page.deleteMany({
		where: { id: String(req.params.id), userId: req.user?.uid ?? "" },
	});
	if (result.count === 0) {
		return res.status(404).json({ error: "Page not found" });
	}
	res.status(204).end();
});

export default router;
