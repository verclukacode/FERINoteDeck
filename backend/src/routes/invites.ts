import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// POST /api/invites — send a direct share invite to a user by username
router.post("/", async (req: Request, res: Response) => {
	const { pageId, username } = req.body as {
		pageId?: string;
		username?: string;
	};
	const senderId = req.user?.uid ?? "";

	if (!pageId || !username) {
		return res.status(400).json({ error: "pageId and username are required" });
	}

	// Verify caller owns the page
	const page = await prisma.page.findFirst({
		where: { id: pageId, userId: senderId },
	});
	if (!page) {
		return res.status(404).json({ error: "Page not found" });
	}

	// Find recipient by username
	const recipient = await prisma.user.findUnique({
		where: { username },
		select: { id: true, username: true },
	});
	if (!recipient) {
		return res.status(404).json({ error: "User not found" });
	}
	if (recipient.id === senderId) {
		return res.status(400).json({ error: "Cannot invite yourself" });
	}

	// Upsert: if already invited reset to pending, otherwise create
	const invite = await prisma.noteInvite.upsert({
		where: { recipientId_pageId: { recipientId: recipient.id, pageId } },
		create: { senderId, recipientId: recipient.id, pageId, status: "pending" },
		update: { status: "pending", senderId },
	});

	res.status(201).json(invite);
});

// GET /api/invites — list pending invites for the current user
router.get("/", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";

	const invites = await prisma.noteInvite.findMany({
		where: { recipientId: uid, status: "pending" },
		include: {
			sender: { select: { username: true, avatarUrl: true, email: true } },
			page: { select: { id: true, title: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	res.json(invites);
});

// PATCH /api/invites/:id — accept or decline an invite
router.patch("/:id", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";
	const { action } = req.body as { action?: "accept" | "decline" };

	if (action !== "accept" && action !== "decline") {
		return res.status(400).json({ error: "action must be accept or decline" });
	}

	const invite = await prisma.noteInvite.findFirst({
		where: { id: String(req.params.id), recipientId: uid },
	});
	if (!invite) {
		return res.status(404).json({ error: "Invite not found" });
	}

	const updated = await prisma.noteInvite.update({
		where: { id: invite.id },
		data: { status: action === "accept" ? "accepted" : "declined" },
	});

	res.json(updated);
});

export default router;
