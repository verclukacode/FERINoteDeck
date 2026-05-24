import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
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
	updateCard,
	updateDeck,
	updateFlashcardFolder,
} from "../../services/flashcardsService.js";

const FlashcardsContext = createContext(null);

export function FlashcardsProvider({ children }) {
	const [folders, setFolders] = useState([]);
	const [decks, setDecks] = useState([]);
	const [cards, setCards] = useState([]);
	const [selectedDeckId, setSelectedDeckId] = useState(null);
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([listFlashcardFolders(), listDecks(), listCards()])
			.then(([f, d, c]) => {
				setFolders(f);
				setDecks(d);
				setCards(c);
			})
			.finally(() => setLoading(false));
	}, []);

	const addFolder = useCallback(async () => {
		const folder = await createFlashcardFolder({ name: "New folder", color: "blue" });
		setFolders((prev) => [...prev, folder]);
	}, []);

	const toggleFolder = useCallback(async (id) => {
		setFolders((prev) =>
			prev.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
		);
		const folder = folders.find((f) => f.id === id);
		if (folder) {
			await updateFlashcardFolder(id, { collapsed: !folder.collapsed });
		}
	}, [folders]);

	const renameFolder = useCallback(async (id, name) => {
		setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
		await updateFlashcardFolder(id, { name });
	}, []);

	const removeFolder = useCallback(async (id) => {
		const removedDeckIds = decks.filter((d) => d.folderId === id).map((d) => d.id);
		setFolders((prev) => prev.filter((f) => f.id !== id));
		setDecks((prev) => prev.filter((d) => d.folderId !== id));
		setCards((prev) => prev.filter((c) => !removedDeckIds.includes(c.deckId)));
		await deleteFlashcardFolder(id);
	}, [decks]);

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
		const card = await createCard({ deckId, type: "rate", question: "", answer: "" });
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
			removeFolder,
			addDeck,
			renameDeck,
			removeDeck,
			selectDeck,
			addCard,
			updateCard: updateCardLocal,
			removeCard,
			selectCard,
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
			removeFolder,
			addDeck,
			renameDeck,
			removeDeck,
			selectDeck,
			addCard,
			updateCardLocal,
			removeCard,
			selectCard,
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
