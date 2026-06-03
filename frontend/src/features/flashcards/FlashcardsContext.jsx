import { arrayMove } from "@dnd-kit/sortable";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	bulkCreateCards,
	createCard,
	createDeck,
	createFlashcardFolder,
	deleteCard,
	deleteDeck,
	deleteFlashcardFolder,
	getDeckInvites,
	listAllDeckSharedWith,
	listCards,
	listDecks,
	listFlashcardFolders,
	reorderFlashcardFolders,
	resetCard as resetCardService,
	resetDeck as resetDeckService,
	respondDeckInvite,
	revokeDeckInvite,
	saveDecks,
	updateCard,
	updateDeck,
	updateFlashcardFolder,
} from "../../services/flashcardsService.js";

const FlashcardsContext = createContext(null);

// Local mirror of the server-side card reset ("Forget"): back to a new card.
const RESET_CARD = {
	state: "new",
	due: null,
	intervalSec: 0,
	ease: 2500,
	reps: 0,
	lapses: 0,
	learningStep: 0,
	lastReviewedAt: null,
};

// Recompute the per-folder `order` field from current array position.
function withDeckOrder(decks) {
	const counters = {};
	return decks.map((d) => {
		const order = counters[d.folderId] ?? 0;
		counters[d.folderId] = order + 1;
		return { ...d, order };
	});
}

export function FlashcardsProvider({ children }) {
	const [folders, setFolders] = useState([]);
	const [decks, setDecks] = useState([]);
	const [cards, setCards] = useState([]);
	const [selectedDeckId, setSelectedDeckId] = useState(null);
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pendingDeckInvites, setPendingDeckInvites] = useState([]);
	const [deckShares, setDeckShares] = useState({});

	const decksRef = useRef(decks);
	decksRef.current = decks;

	useEffect(() => {
		Promise.all([
			listFlashcardFolders(),
			listDecks(),
			listCards(),
			getDeckInvites(),
			listAllDeckSharedWith(),
		])
			.then(([f, d, c, invites, allShares]) => {
				setFolders(f);
				setDecks(d);
				setCards(c);
				setPendingDeckInvites(invites ?? []);
				const sharesMap = {};
				for (const inv of allShares ?? []) {
					if (!sharesMap[inv.deckId]) sharesMap[inv.deckId] = [];
					sharesMap[inv.deckId].push(inv);
				}
				setDeckShares(sharesMap);
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		function onFocus() {
			if (document.visibilityState !== "visible") return;
			listAllDeckSharedWith()
				.then((allShares) => {
					const sharesMap = {};
					for (const inv of allShares ?? []) {
						if (!sharesMap[inv.deckId]) sharesMap[inv.deckId] = [];
						sharesMap[inv.deckId].push(inv);
					}
					setDeckShares(sharesMap);
				})
				.catch(() => {});
		}
		document.addEventListener("visibilitychange", onFocus);
		return () => document.removeEventListener("visibilitychange", onFocus);
	}, []);

	const addFolder = useCallback(async ({ name, color }) => {
		const folder = await createFlashcardFolder({ name, color });
		setFolders((prev) => [...prev, folder]);
		return folder;
	}, []);

	const toggleFolder = useCallback(
		async (id) => {
			setFolders((prev) =>
				prev.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
			);
			const folder = folders.find((f) => f.id === id);
			if (folder) {
				await updateFlashcardFolder(id, { collapsed: !folder.collapsed });
			}
		},
		[folders],
	);

	const renameFolder = useCallback(async (id, name) => {
		setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
		await updateFlashcardFolder(id, { name });
	}, []);

	const editFolder = useCallback(async (id, patch) => {
		setFolders((prev) =>
			prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
		);
		await updateFlashcardFolder(id, patch);
	}, []);

	const removeFolder = useCallback(
		async (id) => {
			const removedDeckIds = decks
				.filter((d) => d.folderId === id)
				.map((d) => d.id);
			setFolders((prev) => prev.filter((f) => f.id !== id));
			setDecks((prev) => prev.filter((d) => d.folderId !== id));
			setCards((prev) =>
				prev.filter((c) => !removedDeckIds.includes(c.deckId)),
			);
			await deleteFlashcardFolder(id);
		},
		[decks],
	);

	const addDeck = useCallback(async (folderId) => {
		const deck = await createDeck({ folderId, name: "New deck" });
		setDecks((prev) => [...prev, deck]);
		setFolders((prev) =>
			prev.map((f) => (f.id === folderId ? { ...f, collapsed: false } : f)),
		);
		setSelectedDeckId(deck.id);
		setSelectedCardId(null);
	}, []);

	const renameDeck = useCallback(async (id, name) => {
		setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
		await updateDeck(id, { name });
	}, []);

	// Marketplace sharing. Patch shape: { isPublic, publicDescription }.
	const updateDeckShare = useCallback(async (id, patch) => {
		const updated = await updateDeck(id, patch);
		setDecks((prev) =>
			prev.map((d) => (d.id === id ? { ...d, ...updated } : d)),
		);
	}, []);

	// Append a deck + its cards cloned from the marketplace and reveal it.
	const addDeckFromClone = useCallback(({ deck, cards: clonedCards = [] }) => {
		setDecks((prev) => [...prev, deck]);
		setCards((prev) => [...prev, ...clonedCards]);
		setFolders((prev) =>
			prev.map((f) =>
				f.id === deck.folderId ? { ...f, collapsed: false } : f,
			),
		);
		setSelectedDeckId(deck.id);
		setSelectedCardId(clonedCards[0]?.id ?? null);
	}, []);

	// Bulk-append cards into an existing deck (CSV import → "existing deck").
	// Server returns the freshly-created rows so we can hydrate local state
	// without a refetch.
	const importCardsIntoDeck = useCallback(async (deckId, newCards) => {
		const created = await bulkCreateCards({ deckId, cards: newCards });
		setCards((prev) => [...prev, ...created]);
		return created;
	}, []);

	const acceptDeckInvite = useCallback(async (inviteId) => {
		const result = await respondDeckInvite(inviteId, "accept");
		setPendingDeckInvites((prev) => prev.filter((i) => i.id !== inviteId));
		if (result?.deck) {
			// Server may have created a new "Shared decks" folder for us.
			setFolders((prev) =>
				prev.some((f) => f.id === result.deck.folderId)
					? prev
					: [
							...prev,
							{
								id: result.deck.folderId,
								name: "Shared decks",
								color: "purple",
								collapsed: false,
								order: prev.length,
							},
						],
			);
			setDecks((prev) => [...prev, result.deck]);
			setCards((prev) => [...prev, ...(result.cards ?? [])]);
		}
	}, []);

	const declineDeckInvite = useCallback(async (inviteId) => {
		await respondDeckInvite(inviteId, "decline");
		setPendingDeckInvites((prev) => prev.filter((i) => i.id !== inviteId));
	}, []);

	const revokeDeckShare = useCallback(async (inviteId, deckId) => {
		await revokeDeckInvite(inviteId);
		setDeckShares((prev) => {
			const updated = (prev[deckId] ?? []).filter((i) => i.id !== inviteId);
			return { ...prev, [deckId]: updated };
		});
	}, []);

	const removeDeck = useCallback(async (id) => {
		setDecks((prev) => prev.filter((d) => d.id !== id));
		setCards((prev) => prev.filter((c) => c.deckId !== id));
		setSelectedDeckId((cur) => (cur === id ? null : cur));
		await deleteDeck(id);
	}, []);

	const selectDeck = useCallback(
		(id) => {
			setSelectedDeckId(id);
			const first = cards.find((c) => c.deckId === id);
			setSelectedCardId(first?.id ?? null);
		},
		[cards],
	);

	const addCard = useCallback(async (deckId) => {
		const card = await createCard({
			deckId,
			type: "rate",
			question: "",
			answer: "",
		});
		setCards((prev) => [...prev, card]);
		setSelectedCardId(card.id);
	}, []);

	const updateCardLocal = useCallback(async (id, patch) => {
		setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
		await updateCard(id, patch);
	}, []);

	// Merge server-fresh card rows into local state without a PATCH — used by
	// StudySession after each answer so the deck panel reflects the new SRS
	// state (state / due / ease) as soon as the session updates them.
	const mergeCards = useCallback((updated) => {
		if (!Array.isArray(updated) || updated.length === 0) return;
		setCards((prev) => {
			const byId = new Map(prev.map((c) => [c.id, c]));
			for (const u of updated) {
				if (u?.id) byId.set(u.id, { ...(byId.get(u.id) ?? {}), ...u });
			}
			return Array.from(byId.values());
		});
	}, []);

	const removeCard = useCallback(async (id) => {
		setCards((prev) => prev.filter((c) => c.id !== id));
		setSelectedCardId((cur) => (cur === id ? null : cur));
		await deleteCard(id);
	}, []);

	const selectCard = useCallback((id) => setSelectedCardId(id), []);

	// Reset a card's study progress back to new ("Forget"). Await the backend
	// before updating local state so DeckPanel's queue refetch (triggered by
	// `statesSig` changing) runs *after* the reset has been persisted —
	// otherwise the refetch races the write and the Study count stays stale.
	const resetCard = useCallback(async (id) => {
		await resetCardService(id);
		setCards((prev) =>
			prev.map((c) => (c.id === id ? { ...c, ...RESET_CARD } : c)),
		);
	}, []);

	// Reset every card in a deck back to new. Same ordering as resetCard.
	const resetDeck = useCallback(async (deckId) => {
		await resetDeckService(deckId);
		setCards((prev) =>
			prev.map((c) => (c.deckId === deckId ? { ...c, ...RESET_CARD } : c)),
		);
	}, []);

	// Live cross-folder move while a deck is dragged over another folder.
	const handleDndOver = useCallback(
		({ activeId, activeType, overId, overType }) => {
			if (activeType !== "deck" || !overId || activeId === overId) return;
			setDecks((prev) => {
				const active = prev.find((d) => d.id === activeId);
				if (!active) return prev;
				const targetFolderId =
					overType === "folder"
						? overId
						: prev.find((d) => d.id === overId)?.folderId;
				if (!targetFolderId || targetFolderId === active.folderId) return prev;
				const without = prev.filter((d) => d.id !== activeId);
				const moved = { ...active, folderId: targetFolderId };
				if (overType === "deck") {
					const idx = without.findIndex((d) => d.id === overId);
					return [...without.slice(0, idx), moved, ...without.slice(idx)];
				}
				return [...without, moved];
			});
		},
		[],
	);

	// Finalize a drag: reorder folders, or settle a deck's position, then persist.
	const handleDndEnd = useCallback(
		({ activeId, activeType, overId, overType }) => {
			if (activeType === "folder") {
				if (!overId) return;
				const targetFolderId =
					overType === "folder"
						? overId
						: decksRef.current.find((d) => d.id === overId)?.folderId;
				if (!targetFolderId) return;
				setFolders((prev) => {
					const from = prev.findIndex((f) => f.id === activeId);
					const to = prev.findIndex((f) => f.id === targetFolderId);
					if (from < 0 || to < 0) return prev;
					const next = arrayMove(prev, from, to).map((f, order) => ({
						...f,
						order,
					}));
					reorderFlashcardFolders(next.map((f) => f.id));
					return next;
				});
				return;
			}

			setDecks((prev) => {
				const active = prev.find((d) => d.id === activeId);
				if (!active) return prev;
				const folderId = active.folderId;
				let group = prev.filter((d) => d.folderId === folderId);
				const overDeck = prev.find((d) => d.id === overId);
				if (overDeck && overDeck.folderId === folderId) {
					const from = group.findIndex((d) => d.id === activeId);
					const to = group.findIndex((d) => d.id === overId);
					if (from >= 0 && to >= 0) group = arrayMove(group, from, to);
				}
				const others = prev.filter((d) => d.folderId !== folderId);
				const next = withDeckOrder([...others, ...group]);
				saveDecks(next);
				return next;
			});
		},
		[],
	);

	const value = useMemo(
		() => ({
			folders,
			decks,
			cards,
			pendingDeckInvites,
			selectedDeckId,
			selectedCardId,
			selectedDeck: decks.find((d) => d.id === selectedDeckId) ?? null,
			selectedCard: cards.find((c) => c.id === selectedCardId) ?? null,
			deckCards: cards.filter((c) => c.deckId === selectedDeckId),
			loading,
			addFolder,
			toggleFolder,
			renameFolder,
			editFolder,
			removeFolder,
			addDeck,
			renameDeck,
			updateDeckShare,
			addDeckFromClone,
			importCardsIntoDeck,
			acceptDeckInvite,
			declineDeckInvite,
			deckShares,
			revokeDeckShare,
			removeDeck,
			selectDeck,
			addCard,
			updateCard: updateCardLocal,
			mergeCards,
			removeCard,
			selectCard,
			resetCard,
			resetDeck,
			handleDndOver,
			handleDndEnd,
		}),
		[
			folders,
			decks,
			cards,
			pendingDeckInvites,
			deckShares,
			selectedDeckId,
			selectedCardId,
			loading,
			addFolder,
			toggleFolder,
			renameFolder,
			editFolder,
			removeFolder,
			addDeck,
			renameDeck,
			updateDeckShare,
			addDeckFromClone,
			importCardsIntoDeck,
			acceptDeckInvite,
			declineDeckInvite,
			revokeDeckShare,
			removeDeck,
			selectDeck,
			addCard,
			updateCardLocal,
			mergeCards,
			removeCard,
			selectCard,
			resetCard,
			resetDeck,
			handleDndOver,
			handleDndEnd,
		],
	);

	return (
		<FlashcardsContext.Provider value={value}>
			{children}
		</FlashcardsContext.Provider>
	);
}

export function useFlashcards() {
	const ctx = useContext(FlashcardsContext);
	if (!ctx)
		throw new Error("useFlashcards must be used within FlashcardsProvider");
	return ctx;
}
