import { type Request, type Response, Router } from "express";
import { cloneDeckForUser } from "../lib/cloneDeck";
import { prisma } from "../lib/prisma";

/**
 * @openapi
 * tags:
 *   - name: DeckInvites
 *     description: Direct deck-sharing invites (mirrors note invites)
 */
const router = Router();

/**
 * @openapi
 * /api/deck-invites:
 *   post:
 *     summary: Invite another user to study your deck
 *     tags: [DeckInvites]
 *     responses:
 *       201: { description: The invite }
 *       400: { description: Bad request }
 *       404: { description: Deck or user not found }
 */
router.post("/", async (req: Request, res: Response) => {
	const { deckId, username } = req.body as {
		deckId?: string;
		username?: string;
	};
	const senderId = req.user?.uid ?? "";

	if (!deckId || !username) {
		return res.status(400).json({ error: "deckId and username are required" });
	}

	const deck = await prisma.deck.findFirst({
		where: { id: deckId, userId: senderId },
	});
	if (!deck) {
		return res.status(404).json({ error: "Deck not found" });
	}
	// Members can't re-share someone else's deck via their clone.
	if (deck.sharedFromDeckId !== null) {
		return res
			.status(403)
			.json({ error: "Only the original owner can invite to this deck" });
	}

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

	const invite = await prisma.deckInvite.upsert({
		where: { recipientId_deckId: { recipientId: recipient.id, deckId } },
		create: { senderId, recipientId: recipient.id, deckId, status: "pending" },
		update: { status: "pending", senderId },
	});

	res.status(201).json(invite);
});

/**
 * @openapi
 * /api/deck-invites:
 *   get:
 *     summary: List pending deck invites for the current user
 *     tags: [DeckInvites]
 *     responses:
 *       200: { description: Array of pending invites }
 */
// GET /api/deck-invites/sent/all — all accepted invites sent by the caller
router.get("/sent/all", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";

	const invites = await prisma.deckInvite.findMany({
		where: { senderId: uid, status: "accepted" },
		select: {
			id: true,
			deckId: true,
			recipient: { select: { username: true, avatarUrl: true, email: true } },
		},
		orderBy: { updatedAt: "asc" },
	});

	res.json(invites);
});

// DELETE /api/deck-invites/:id — owner revokes an accepted invite
router.delete("/:id", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";

	const invite = await prisma.deckInvite.findFirst({
		where: { id: String(req.params.id), senderId: uid },
	});
	if (!invite) {
		return res.status(404).json({ error: "Invite not found" });
	}

	await prisma.deckInvite.delete({ where: { id: invite.id } });
	res.status(204).end();
});

router.get("/", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";

	const invites = await prisma.deckInvite.findMany({
		where: { recipientId: uid, status: "pending" },
		include: {
			sender: { select: { username: true, avatarUrl: true } },
			deck: { select: { id: true, name: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	res.json(invites);
});

/**
 * @openapi
 * /api/deck-invites/{id}:
 *   patch:
 *     summary: Accept or decline a deck invite (accept clones the deck)
 *     tags: [DeckInvites]
 *     responses:
 *       200: { description: "{ invite } on decline, { invite, deck, cards } on accept" }
 *       400: { description: Bad action }
 *       404: { description: Invite not found }
 */
router.patch("/:id", async (req: Request, res: Response) => {
	const uid = req.user?.uid ?? "";
	const { action } = req.body as { action?: "accept" | "decline" };

	if (action !== "accept" && action !== "decline") {
		return res.status(400).json({ error: "action must be accept or decline" });
	}

	const invite = await prisma.deckInvite.findFirst({
		where: { id: String(req.params.id), recipientId: uid },
	});
	if (!invite) {
		return res.status(404).json({ error: "Invite not found" });
	}

	if (action === "decline") {
		const updated = await prisma.deckInvite.update({
			where: { id: invite.id },
			data: { status: "declined" },
		});
		return res.json({ invite: updated });
	}

	// Accept: flip status + clone the deck into the recipient's first folder
	// (auto-create a "Shared decks" folder if they have none). The clone is
	// linked back via sharedFromDeckId so it shows on the leaderboard.
	let targetFolder = await prisma.flashcardFolder.findFirst({
		where: { userId: uid },
		orderBy: { order: "asc" },
	});
	if (!targetFolder) {
		targetFolder = await prisma.flashcardFolder.create({
			data: { userId: uid, name: "Shared decks", color: "purple" },
		});
	}

	const result = await prisma.$transaction(async (tx) => {
		const updated = await tx.deckInvite.update({
			where: { id: invite.id },
			data: { status: "accepted" },
		});
		const clone = await cloneDeckForUser(tx, {
			sourceDeckId: invite.deckId,
			recipientUserId: uid,
			targetFolderId: targetFolder.id,
			sharedFromDeckId: invite.deckId,
		});
		return { invite: updated, ...clone };
	});

	res.json(result);
});

export default router;
