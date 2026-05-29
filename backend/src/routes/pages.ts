import { type Request, type Response, Router } from "express";
import { extractImageUrls, isAllowedImageUrl } from "../lib/imageValidation";
import { prisma } from "../lib/prisma";

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
	const { folderId, title } = req.body as { folderId?: string; title?: string };
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
			content: "Nothing here yet, tap to edit.",
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
