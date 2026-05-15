import Icon from "../../components/Icon.jsx";
import { useNotes } from "./NotesContext.jsx";

export default function NotePanel() {
	const { selectedPage } = useNotes();

	if (!selectedPage) {
		return (
			<div className="flex flex-1 items-center justify-center text-body">
				Select a page to open it.
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col">
			<div className="flex items-center justify-between border-b border-border-soft px-8 py-5">
				<h1 className="text-2xl font-bold text-title">{selectedPage.title}</h1>
				<div className="flex items-center gap-3">
					<button type="button" className="text-body">
						<Icon name="party" size={20} />
					</button>
					<button
						type="button"
						className="flex items-center gap-2 rounded-full border border-folder-blue/40 bg-folder-blue/10 px-4 py-2 text-sm font-semibold text-folder-blue"
					>
						<Icon name="flashcards" size={16} />
						Create Flashcards
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto px-8 py-6" />
		</div>
	);
}
