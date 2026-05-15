import Icon from "../../components/Icon.jsx";

export default function FlashcardsPlaceholder() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-3 text-body">
			<Icon name="flashcards" size={40} />
			<p className="text-lg font-semibold text-title">Flashcards</p>
			<p>Coming soon.</p>
		</div>
	);
}
