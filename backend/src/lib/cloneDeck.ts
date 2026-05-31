import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export type CloneDeckResult = {
	deck: Awaited<ReturnType<TxClient["deck"]["create"]>>;
	cards: Array<{
		id: string;
		userId: string;
		deckId: string;
		type: string;
		question: string;
		answer: string;
		order: number;
		state: string;
		createdAt: Date;
		updatedAt: Date;
	}>;
};

// Clones a deck (and its cards, with fresh scheduling) into another user's
// folder. Used by the marketplace clone endpoint AND the deck-invite accept
// handler. Pass `sharedFromDeckId: sourceDeckId` for an invite-clone so it
// shows up on the source deck's leaderboard; pass null for a marketplace clone
// (fully independent copy).
export async function cloneDeckForUser(
	tx: TxClient,
	args: {
		sourceDeckId: string;
		recipientUserId: string;
		targetFolderId: string;
		sharedFromDeckId: string | null;
	},
): Promise<CloneDeckResult> {
	const source = await tx.deck.findUnique({
		where: { id: args.sourceDeckId },
		include: { cards: { orderBy: { order: "asc" } } },
	});
	if (!source) throw new Error("Source deck not found");

	const order = await tx.deck.count({
		where: { folderId: args.targetFolderId },
	});
	const deck = await tx.deck.create({
		data: {
			userId: args.recipientUserId,
			folderId: args.targetFolderId,
			name: source.name,
			order,
			isPublic: false,
			publicDescription: null,
			publishedAt: null,
			sharedFromDeckId: args.sharedFromDeckId,
		},
	});

	if (source.cards.length) {
		// Omit scheduling fields: schema defaults give a fresh state="new" card.
		await tx.flashCard.createMany({
			data: source.cards.map((c) => ({
				userId: args.recipientUserId,
				deckId: deck.id,
				type: c.type,
				question: c.question,
				answer: c.answer,
				order: c.order,
			})),
		});
	}

	const cards = await tx.flashCard.findMany({
		where: { deckId: deck.id },
		// Strip BigInt scheduling fields from the response.
		select: {
			id: true,
			userId: true,
			deckId: true,
			type: true,
			question: true,
			answer: true,
			order: true,
			state: true,
			createdAt: true,
			updatedAt: true,
		},
		orderBy: { order: "asc" },
	});
	return { deck, cards };
}
