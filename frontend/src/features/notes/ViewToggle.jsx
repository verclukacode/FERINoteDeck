import { VIEW } from "../../lib/constants.js";
import { useNotes } from "./NotesContext.jsx";

const OPTIONS = [
	{ value: VIEW.NOTES, label: "Notes" },
	{ value: VIEW.FLASHCARDS, label: "Flashcards" },
];

export default function ViewToggle() {
	const { view, setView } = useNotes();

	return (
		<div className="flex h-[45px] items-center gap-1 rounded-full bg-bg p-1">
			{OPTIONS.map((opt) => {
				const active = view === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						onClick={() => setView(opt.value)}
						className={`flex h-full items-center rounded-full px-5 font-semibold outline-none transition-colors ${
							active ? "bg-bg-secondary text-title" : "text-body"
						}`}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}
