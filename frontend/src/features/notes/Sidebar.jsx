import { useState } from "react";
import { useResizableWidth } from "../../hooks/useResizableWidth.js";
import { VIEW } from "../../lib/constants.js";
import DeckList from "../flashcards/DeckList.jsx";
import AddFolderButton from "./AddFolderButton.jsx";
import FolderList from "./FolderList.jsx";
import NotificationsModal from "./NotificationsModal.jsx";
import { useNotes } from "./NotesContext.jsx";
import SharedPageItem from "./SharedPageItem.jsx";
import SidebarHeader from "./SidebarHeader.jsx";
import UserProfileRow from "./UserProfileRow.jsx";

export default function Sidebar({ onOpenMarketplace, onOpenSearch }) {
	const { view, sharedPages } = useNotes();
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const { width, ref, startResize } = useResizableWidth({
		initial: 428,
		min: 360,
		max: 620,
		storageKey: "notedeck.sidebarWidth",
	});

	return (
		<aside
			ref={ref}
			style={{ width }}
			className="relative flex shrink-0 flex-col overflow-hidden rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary"
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
	);
}
