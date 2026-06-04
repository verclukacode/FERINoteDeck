import CardDetails from "./CardDetails.jsx";
import DeckPanel from "./DeckPanel.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";

export default function FlashcardsView() {
	const { selectedCardId } = useFlashcards();
	// On mobile only one of the two columns is shown at a time — the card
	// details takes over the viewport when a card is selected. Desktop keeps
	// both side-by-side.
	return (
		<>
			<div
				className={`${selectedCardId ? "hidden" : "flex"} min-w-0 flex-1 sm:flex`}
			>
				<DeckPanel />
			</div>
			<CardDetails />
		</>
	);
}
