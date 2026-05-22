import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

// In-memory only — no backend/persistence yet. Seeded with sample data that
// mirrors the Figma reference so the UI has something to show on first load.
const FlashcardsContext = createContext(null);

const uid = () => crypto.randomUUID();

function seed() {
	const geo = uid();
	const mat = uid();
	const slo = uid();
	const ang = uid();

	const folders = [
		{ id: mat, name: "Matematika", color: "blue", collapsed: true },
		{ id: slo, name: "Slovenščina", color: "green", collapsed: true },
		{ id: geo, name: "Geografija", color: "pink", collapsed: false },
		{ id: ang, name: "Angleščina", color: "orange", collapsed: true },
	];

	const tektonika = uid();
	const pasovi = uid();
	const prebivalstvo = uid();
	const urbanizacija = uid();

	const decks = [
		{ id: tektonika, folderId: geo, name: "Tektonske plošče in relief" },
		{ id: pasovi, folderId: geo, name: "Toplotni pasovi" },
		{
			id: prebivalstvo,
			folderId: geo,
			name: "Prebivalstvo in demografija v Evropi",
		},
		{ id: urbanizacija, folderId: geo, name: "Urbanizacija" },
	];

	const cards = [
		{
			id: uid(),
			deckId: pasovi,
			type: "rate",
			question: "Kateri so glavni toplotni pasovi na Zemlji?",
			answer: "Tropski (vroči), zmerni in polarni (mrzli) pas.",
		},
		{
			id: uid(),
			deckId: pasovi,
			type: "rate",
			question: "Kje leži tropski pas?",
			answer: "Med povratnikoma, okoli ekvatorja.",
		},
		{
			id: uid(),
			deckId: pasovi,
			type: "rate",
			question: "Zakaj je na polih najhladneje?",
			answer: "Sončni žarki padajo zelo poševno, zato je obsevanje šibko.",
		},
		{
			id: uid(),
			deckId: pasovi,
			type: "rate",
			question: "Kateri toplotni pas ima štiri letne čase?",
			answer: "Zmerni toplotni pas.",
		},
	];

	return {
		folders,
		decks,
		cards,
		selectedDeckId: pasovi,
		selectedCardId: cards[0].id,
	};
}

export function FlashcardsProvider({ children }) {
	const initial = useMemo(seed, []);
	const [folders, setFolders] = useState(initial.folders);
	const [decks, setDecks] = useState(initial.decks);
	const [cards, setCards] = useState(initial.cards);
	const [selectedDeckId, setSelectedDeckId] = useState(initial.selectedDeckId);
	const [selectedCardId, setSelectedCardId] = useState(initial.selectedCardId);

	const addFolder = useCallback(() => {
		const folder = {
			id: uid(),
			name: "New folder",
			color: "blue",
			collapsed: false,
		};
		setFolders((prev) => [...prev, folder]);
	}, []);

	const toggleFolder = useCallback((id) => {
		setFolders((prev) =>
			prev.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
		);
	}, []);

	const renameFolder = useCallback((id, name) => {
		setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
	}, []);

	const removeFolder = useCallback(
		(id) => {
			setFolders((prev) => prev.filter((f) => f.id !== id));
			setDecks((prev) => prev.filter((d) => d.folderId !== id));
			setCards((prev) => {
				const removedDeckIds = decks
					.filter((d) => d.folderId === id)
					.map((d) => d.id);
				return prev.filter((c) => !removedDeckIds.includes(c.deckId));
			});
		},
		[decks],
	);

	const addDeck = useCallback((folderId) => {
		const deck = { id: uid(), folderId, name: "New deck" };
		setDecks((prev) => [...prev, deck]);
		setFolders((prev) =>
			prev.map((f) => (f.id === folderId ? { ...f, collapsed: false } : f)),
		);
		setSelectedDeckId(deck.id);
		setSelectedCardId(null);
	}, []);

	const renameDeck = useCallback((id, name) => {
		setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
	}, []);

	const removeDeck = useCallback((id) => {
		setDecks((prev) => prev.filter((d) => d.id !== id));
		setCards((prev) => prev.filter((c) => c.deckId !== id));
		setSelectedDeckId((cur) => (cur === id ? null : cur));
	}, []);

	const selectDeck = useCallback(
		(id) => {
			setSelectedDeckId(id);
			const first = cards.find((c) => c.deckId === id);
			setSelectedCardId(first?.id ?? null);
		},
		[cards],
	);

	const addCard = useCallback((deckId) => {
		const card = { id: uid(), deckId, type: "rate", question: "", answer: "" };
		setCards((prev) => [...prev, card]);
		setSelectedCardId(card.id);
	}, []);

	const updateCard = useCallback((id, patch) => {
		setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
	}, []);

	const removeCard = useCallback((id) => {
		setCards((prev) => prev.filter((c) => c.id !== id));
		setSelectedCardId((cur) => (cur === id ? null : cur));
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
			addFolder,
			toggleFolder,
			renameFolder,
			removeFolder,
			addDeck,
			renameDeck,
			removeDeck,
			selectDeck,
			addCard,
			updateCard,
			removeCard,
			selectCard,
		}),
		[
			folders,
			decks,
			cards,
			selectedDeckId,
			selectedCardId,
			addFolder,
			toggleFolder,
			renameFolder,
			removeFolder,
			addDeck,
			renameDeck,
			removeDeck,
			selectDeck,
			addCard,
			updateCard,
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
