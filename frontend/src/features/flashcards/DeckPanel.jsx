import { useState } from "react";
import Icon from "../../components/Icon.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";
import StudySession from "./StudySession.jsx";

// Editable deck title — Enter (or blur) commits, empty input reverts.
function DeckTitle({ deck, onRename }) {
	const [value, setValue] = useState(deck.name);

	const commit = () => {
		const next = value.trim();
		if (next && next !== deck.name) onRename(deck.id, next);
		else setValue(deck.name);
	};

	return (
		<input
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") e.currentTarget.blur();
			}}
			onBlur={commit}
			className="-mx-2 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-3xl font-bold text-title outline-none focus:bg-bg"
		/>
	);
}

function QuestionRow({ card, selected, onSelect }) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`flex w-full items-center gap-3 rounded-[22.5px] border-[2.5px] px-5 py-4 text-left transition-colors ${
				selected
					? "border-folder-blue bg-folder-blue/15"
					: "border-transparent bg-bg hover:border-border-soft"
			}`}
		>
			<span className="flex-1 font-medium text-title line-clamp-2">
				{card.question || (
					<span className="text-body/60">Untitled question</span>
				)}
			</span>
			<Icon name="chevron" size={14} className="shrink-0 text-body" />
		</button>
	);
}

export default function DeckPanel() {
	const {
		selectedDeck,
		deckCards,
		selectedCardId,
		selectCard,
		addCard,
		renameDeck,
	} = useFlashcards();
	const [studying, setStudying] = useState(false);

	if (!selectedDeck) {
		return (
			<main className="flex flex-1 items-center justify-center rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary text-body">
				Select a deck to open it.
			</main>
		);
	}

	return (
		<main className="flex flex-1 flex-col overflow-hidden rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary">
			<div className="flex h-[88px] items-center gap-4 border-b-2 border-border-soft px-6">
				<DeckTitle
					key={selectedDeck.id}
					deck={selectedDeck}
					onRename={renameDeck}
				/>
				<button
					type="button"
					className="flex h-[45px] w-[45px] items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title"
					aria-label="Share deck"
				>
					<Icon name="paperplane" size={20} />
				</button>
				<button
					type="button"
					disabled={deckCards.length === 0}
					onClick={() => setStudying(true)}
					className="flex h-[45px] items-center gap-2 rounded-full border-[2.5px] border-folder-pink/30 bg-folder-pink/15 px-5 text-[15px] font-semibold text-folder-pink disabled:opacity-40"
				>
					<Icon name="study-hat" size={20} />
					Study {deckCards.length}
				</button>
			</div>

			<div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
				{deckCards.map((card) => (
					<QuestionRow
						key={card.id}
						card={card}
						selected={card.id === selectedCardId}
						onSelect={() => selectCard(card.id)}
					/>
				))}

				<button
					type="button"
					onClick={() => addCard(selectedDeck.id)}
					className="min-h-[62px] w-full rounded-[22.5px] border-2 border-dashed border-body/40 font-semibold text-title"
				>
					Add flashcard
				</button>
			</div>

			{studying && (
				<StudySession cards={deckCards} onClose={() => setStudying(false)} />
			)}
		</main>
	);
}
