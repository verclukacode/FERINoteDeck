import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FlashcardsProvider } from "../features/flashcards/FlashcardsContext.jsx";
import FlashcardsView from "../features/flashcards/FlashcardsView.jsx";
import AccountModal from "../features/notes/AccountModal.jsx";
import NotePanel from "../features/notes/NotePanel.jsx";
import { NotesProvider, useNotes } from "../features/notes/NotesContext.jsx";
import Sidebar from "../features/notes/Sidebar.jsx";
import { VIEW } from "../lib/constants.js";

function NotesWorkspace() {
	const { view, loading, accountOpen, setAccountOpen, username } = useNotes();
	const navigate = useNavigate();

	useEffect(() => {
		if (!loading && !username) {
			navigate("/choose-username", { replace: true });
		}
	}, [loading, username, navigate]);

	return (
		<div className="relative flex h-full gap-4 bg-bg p-4">
			<Sidebar />
			{loading ? (
				<main className="flex flex-1 items-center justify-center rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary text-body">
					Loading...
				</main>
			) : view === VIEW.FLASHCARDS ? (
				<FlashcardsView />
			) : (
				<main className="flex flex-1 overflow-hidden rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary">
					<NotePanel />
				</main>
			)}

			{accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
		</div>
	);
}

export default function NotesPage() {
	return (
		<NotesProvider>
			<FlashcardsProvider>
				<NotesWorkspace />
			</FlashcardsProvider>
		</NotesProvider>
	);
}
