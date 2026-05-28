import { useResizableWidth } from "../../hooks/useResizableWidth.js";
import { VIEW } from "../../lib/constants.js";
import DeckList from "../flashcards/DeckList.jsx";
import AddFolderButton from "./AddFolderButton.jsx";
import FolderList from "./FolderList.jsx";
import { useNotes } from "./NotesContext.jsx";
import SidebarHeader from "./SidebarHeader.jsx";
import UserProfileRow from "./UserProfileRow.jsx";

export default function Sidebar({ onOpenMarketplace, onOpenSearch }) {
	const { view } = useNotes();
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
			/>
			<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
				{view === VIEW.FLASHCARDS ? (
					<DeckList />
				) : (
					<>
						<FolderList />
						<AddFolderButton />
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
		</aside>
	);
}
