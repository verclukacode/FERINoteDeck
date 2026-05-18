import AccountModal from "../features/notes/AccountModal.jsx";
import FlashcardsPlaceholder from "../features/notes/FlashcardsPlaceholder.jsx";
import NotePanel from "../features/notes/NotePanel.jsx";
import { NotesProvider, useNotes } from "../features/notes/NotesContext.jsx";
import Sidebar from "../features/notes/Sidebar.jsx";
import { VIEW } from "../lib/constants.js";

function NotesWorkspace() {
	const { view, loading, accountOpen, setAccountOpen } = useNotes();

	return (
		<div className="flex h-full gap-4 bg-bg p-4">
			<Sidebar />
			<main className="relative flex flex-1 overflow-hidden rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary">
				{loading ? (
					<div className="flex flex-1 items-center justify-center text-body">
						Loading...
					</div>
				) : view === VIEW.FLASHCARDS ? (
					<FlashcardsPlaceholder />
				) : (
					<NotePanel />
				)}

				{accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
			</main>
		</div>
	);
}

export default function NotesPage() {
	return (
		<NotesProvider>
			<NotesWorkspace />
		</NotesProvider>
	);
}
