import { useState } from "react";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import { folderHex } from "../../lib/constants.js";
import {
	cloneMarketplaceDeck,
	cloneMarketplaceNote,
} from "../../services/marketplaceService.js";
import FlashcardFolderModal from "../flashcards/FlashcardFolderModal.jsx";
import { useFlashcards } from "../flashcards/FlashcardsContext.jsx";
import FolderModal from "../notes/FolderModal.jsx";
import { useNotes } from "../notes/NotesContext.jsx";

// Pick a destination folder (or create one inline), then call the clone
// endpoint and notify the parent context to hydrate state.
export default function CloneFolderPickerDialog({
	kind,
	sourceId,
	sourceTitle,
	onClose,
	onCloned,
}) {
	const { folders: noteFolders, addPageFromClone } = useNotes();
	const { folders: flashcardFolders, addDeckFromClone } = useFlashcards();
	const folders = kind === "note" ? noteFolders : flashcardFolders;

	const [cloning, setCloning] = useState(false);
	const [error, setError] = useState("");
	const [creatingFolder, setCreatingFolder] = useState(false);

	async function cloneInto(folderId) {
		setCloning(true);
		setError("");
		try {
			if (kind === "note") {
				const page = await cloneMarketplaceNote(sourceId, folderId);
				addPageFromClone(page);
			} else {
				const result = await cloneMarketplaceDeck(sourceId, folderId);
				addDeckFromClone(result);
			}
			onCloned?.();
			onClose();
		} catch (e) {
			setError(e?.message ?? "Clone failed");
		} finally {
			setCloning(false);
		}
	}

	function handleNewFolderCreated(folder) {
		// FolderModal already added the folder to context state — auto-clone in.
		setCreatingFolder(false);
		cloneInto(folder.id);
	}

	return (
		<>
			<Modal open onClose={onClose}>
				<h2 className="px-1 text-2xl font-bold text-title">Clone into…</h2>
				{sourceTitle && (
					<p className="mt-1 px-1 text-sm text-body">
						Where should "{sourceTitle}" go?
					</p>
				)}

				<div className="mt-5 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
					<button
						type="button"
						disabled={cloning}
						onClick={() => setCreatingFolder(true)}
						className="flex items-center gap-3 rounded-2xl border-[2.5px] border-dashed border-body/40 px-4 py-3 text-left text-folder-blue hover:bg-bg-secondary disabled:opacity-60"
					>
						<Icon name="plus" size={18} />
						<span className="flex-1 font-semibold">New folder</span>
					</button>

					{folders.length === 0 ? (
						<p className="py-4 text-center text-sm text-body">
							No {kind === "note" ? "note" : "flashcard"} folders yet. Create
							one above.
						</p>
					) : (
						folders.map((folder) => (
							<button
								key={folder.id}
								type="button"
								disabled={cloning}
								onClick={() => cloneInto(folder.id)}
								className="flex items-center gap-3 rounded-2xl border-[2.5px] border-border-soft px-4 py-3 text-left hover:bg-bg-secondary disabled:opacity-60"
							>
								<Icon
									name="folder"
									size={20}
									style={{ color: folderHex(folder.color) }}
								/>
								<span className="flex-1 truncate font-medium text-title">
									{folder.name}
								</span>
							</button>
						))
					)}
				</div>

				{error && (
					<p className="mt-3 text-center text-sm text-folder-red">{error}</p>
				)}

				<button
					type="button"
					onClick={onClose}
					disabled={cloning}
					className="mt-4 w-full py-1 font-medium text-title disabled:opacity-60"
				>
					Cancel
				</button>
			</Modal>

			{creatingFolder &&
				(kind === "note" ? (
					<FolderModal
						onClose={() => setCreatingFolder(false)}
						onCreated={handleNewFolderCreated}
					/>
				) : (
					<FlashcardFolderModal
						onClose={() => setCreatingFolder(false)}
						onCreated={handleNewFolderCreated}
					/>
				))}
		</>
	);
}
