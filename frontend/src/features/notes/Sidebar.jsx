import { useEffect, useState } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { useResizableWidth } from "../../hooks/useResizableWidth.js";
import { VIEW } from "../../lib/constants.js";
import DeckList from "../flashcards/DeckList.jsx";
import { useFlashcards } from "../flashcards/FlashcardsContext.jsx";
import AddFolderButton from "./AddFolderButton.jsx";
import FolderList from "./FolderList.jsx";
import ImportFilesButton from "./ImportFilesButton.jsx";
import { useMobileNav } from "./MobileNavContext.jsx";
import { useNotes } from "./NotesContext.jsx";
import NotificationsModal from "./NotificationsModal.jsx";
import SharedPageItem from "./SharedPageItem.jsx";
import SidebarHeader from "./SidebarHeader.jsx";
import UserProfileRow from "./UserProfileRow.jsx";

export default function Sidebar({ onOpenMarketplace, onOpenSearch }) {
	const { view, sharedPages, selectedPageId } = useNotes();
	const { selectedDeckId } = useFlashcards();
	const { sidebarOpen, closeSidebar } = useMobileNav();
	const isDesktop = useMediaQuery("(min-width: 640px)");
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const { width, ref, startResize } = useResizableWidth({
		initial: 428,
		min: 360,
		max: 620,
		storageKey: "notedeck.sidebarWidth",
	});

	// Mobile: when the user picks a page / deck from the sidebar drawer, close
	// it so the editor underneath comes back into view. We intentionally watch
	// only the selection ids — the other deps are stable.
	// biome-ignore lint/correctness/useExhaustiveDependencies: react to selection only
	useEffect(() => {
		if (!isDesktop && sidebarOpen) closeSidebar();
	}, [selectedPageId, selectedDeckId]);

	return (
		<>
			{/* Mobile-only backdrop. Tapping it dismisses the drawer. */}
			{!isDesktop && sidebarOpen && (
				<button
					type="button"
					aria-label="Close sidebar"
					onClick={closeSidebar}
					className="fixed inset-0 z-30 bg-black/30 sm:hidden"
				/>
			)}
			<aside
				ref={ref}
				style={isDesktop ? { width } : undefined}
				className={`flex-col overflow-hidden border-border-soft bg-bg-secondary sm:relative sm:z-auto sm:flex sm:shrink-0 sm:rounded-[30px] sm:border-[2.5px] ${
					sidebarOpen
						? "fixed inset-y-2 left-2 right-2 z-40 flex rounded-[24px] border-[2.5px] sm:inset-auto"
						: "hidden"
				}`}
			>
				<SidebarHeader
					onOpenMarketplace={onOpenMarketplace}
					onOpenSearch={onOpenSearch}
					onOpenNotifications={() => setNotificationsOpen(true)}
				/>
				<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
					{view === VIEW.FLASHCARDS ? (
						<DeckList />
					) : (
						<>
							<FolderList />
							<AddFolderButton />
							<ImportFilesButton />
							{sharedPages.length > 0 && (
								<div className="flex flex-col gap-1">
									<div className="flex items-center gap-3 py-1">
										<div className="flex-1 border-t-[2px] border-dashed border-border-soft" />
										<span className="text-xs font-semibold uppercase tracking-wide text-body">
											Shared
										</span>
										<div className="flex-1 border-t-[2px] border-dashed border-border-soft" />
									</div>
									{sharedPages.map((page) => (
										<SharedPageItem key={page.id} page={page} />
									))}
								</div>
							)}
						</>
					)}
				</div>
				<UserProfileRow />
				<button
					type="button"
					aria-label="Resize sidebar"
					onPointerDown={startResize}
					className="absolute inset-y-0 right-0 w-2 cursor-col-resize hover:bg-border-soft"
				/>
				{notificationsOpen && (
					<NotificationsModal onClose={() => setNotificationsOpen(false)} />
				)}
			</aside>
		</>
	);
}
