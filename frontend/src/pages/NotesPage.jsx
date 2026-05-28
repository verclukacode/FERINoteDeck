import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FlashcardsProvider } from "../features/flashcards/FlashcardsContext.jsx";
import FlashcardsView from "../features/flashcards/FlashcardsView.jsx";
import MarketplaceModal from "../features/marketplace/MarketplaceModal.jsx";
import {
	MARKET_PARAM,
	parseMarketplaceLink,
} from "../features/marketplace/marketplaceLink.js";
import AccountModal from "../features/notes/AccountModal.jsx";
import NotePanel from "../features/notes/NotePanel.jsx";
import { NotesProvider, useNotes } from "../features/notes/NotesContext.jsx";
import Sidebar from "../features/notes/Sidebar.jsx";
import SearchModal from "../features/search/SearchModal.jsx";
import { VIEW } from "../lib/constants.js";

function NotesWorkspace() {
	const { view, loading, accountOpen, setAccountOpen, username } = useNotes();
	const [marketplaceOpen, setMarketplaceOpen] = useState(false);
	const [initialMarketSelected, setInitialMarketSelected] = useState(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();

	useEffect(() => {
		if (!loading && !username) {
			// Carry the current URL (e.g. ?market=note:abc) through so the user
			// lands back here after they pick a username.
			navigate("/choose-username", {
				replace: true,
				state: { from: location },
			});
		}
	}, [loading, username, navigate, location]);

	// Honour a deep link like `/?market=note:abc` once, then strip the param so
	// refreshes don't reopen the modal.
	useEffect(() => {
		const raw = searchParams.get(MARKET_PARAM);
		if (!raw) return;
		const link = parseMarketplaceLink(`?${MARKET_PARAM}=${raw}`);
		if (link) {
			setInitialMarketSelected({ kind: link.kind, id: link.id, title: "" });
			setMarketplaceOpen(true);
		}
		const next = new URLSearchParams(searchParams);
		next.delete(MARKET_PARAM);
		setSearchParams(next, { replace: true });
	}, [searchParams, setSearchParams]);

	function closeMarketplace() {
		setMarketplaceOpen(false);
		setInitialMarketSelected(null);
	}

	return (
		<div className="relative flex h-full gap-4 bg-bg p-4">
			<Sidebar
				onOpenMarketplace={() => setMarketplaceOpen(true)}
				onOpenSearch={() => setSearchOpen(true)}
			/>
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
			{marketplaceOpen && (
				<MarketplaceModal
					initialSelected={initialMarketSelected}
					onClose={closeMarketplace}
				/>
			)}
			{searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
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
