import Icon from "../../components/Icon.jsx";

// Static deck row — used as the drag placeholder and the drag overlay.
export default function DeckPreview({ deck, dimmed = false }) {
	return (
		<div
			className={`flex items-center gap-3 rounded-[14px] px-4 py-2 ${
				dimmed ? "opacity-40" : "bg-bg shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
			}`}
		>
			<Icon name="flashcards" size={20} />
			<span className="truncate font-medium text-body">{deck.name}</span>
		</div>
	);
}
