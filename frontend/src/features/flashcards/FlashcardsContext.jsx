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
	createCard,
	createDeck,
	createFlashcardFolder,
	deleteCard,
	deleteDeck,
	deleteFlashcardFolder,
	listCards,
	listDecks,
	listFlashcardFolders,
	reorderFlashcardFolders,
	saveDecks,
	updateCard,
	updateDeck,
	updateFlashcardFolder,
} from "../../services/flashcardsService.js";

const FlashcardsContext = createContext(null);

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

	const decksRef = useRef(decks);
	decksRef.current = decks;

	useEffect(() => {
		Promise.all([listFlashcardFolders(), listDecks(), listCards()])
			.then(([f, d, c]) => {
				setFolders(f);
				setDecks(d);
				setCards(c);
			})
			.finally(() => setLoading(false));
	}, []);

	const addFolder = useCallback(async ({ name, color }) => {
		const folder = await createFlashcardFolder({ name, color });
		setFolders((prev) => [...prev, folder]);
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

	const removeCard = useCallback(async (id) => {
		setCards((prev) => prev.filter((c) => c.id !== id));
		setSelectedCardId((cur) => (cur === id ? null : cur));
		await deleteCard(id);
	}, []);

	const selectCard = useCallback((id) => setSelectedCardId(id), []);

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
			removeDeck,
			selectDeck,
			addCard,
			updateCard: updateCardLocal,
			removeCard,
			selectCard,
			handleDndOver,
			handleDndEnd,
		}),
		[
			folders,
			decks,
			cards,
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
			removeDeck,
			selectDeck,
			addCard,
			updateCardLocal,
			removeCard,
			selectCard,
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
