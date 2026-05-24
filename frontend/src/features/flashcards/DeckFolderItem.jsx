import { useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import ContextMenu from "../../components/ContextMenu.jsx";
import Icon from "../../components/Icon.jsx";
import { useContextMenu } from "../../hooks/useContextMenu.js";
import { folderHex } from "../../lib/constants.js";
import FlashcardFolderModal from "./FlashcardFolderModal.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";

function DeckRow({ deck }) {
	const { selectedDeckId, selectDeck, removeDeck } = useFlashcards();
	const { menu, open, close } = useContextMenu();
	const [confirming, setConfirming] = useState(false);
	const selected = deck.id === selectedDeckId;

	return (
		<>
			<button
				type="button"
				onClick={() => selectDeck(deck.id)}
				onContextMenu={open}
				className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-2 text-left ${
					selected
						? "font-semibold text-title underline"
						: "font-medium text-body hover:bg-bg-secondary"
				}`}
			>
				<Icon name="flashcards" size={20} />
				<span className="truncate">{deck.name}</span>
			</button>

			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					items={[
						{
							label: "Delete deck",
							icon: "trash",
							danger: true,
							onClick: () => {
								setConfirming(true);
								close();
							},
						},
					]}
				/>
			)}

			{confirming && (
				<ConfirmDialog
					title="Delete deck?"
					message={`"${deck.name}" and all its cards will be deleted.`}
					onConfirm={() => {
						removeDeck(deck.id);
						setConfirming(false);
					}}
					onCancel={() => setConfirming(false)}
				/>
			)}
		</>
	);
}

export default function DeckFolderItem({ folder }) {
	const { decks, toggleFolder, addDeck, removeFolder } = useFlashcards();
	const { menu, open, close } = useContextMenu();
	const [editing, setEditing] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const folderDecks = decks.filter((d) => d.folderId === folder.id);

	return (
		<div>
			<div
				className={`rounded-[22px] bg-bg ${folder.collapsed ? "" : "pb-2"}`}
				onContextMenu={open}
			>
				<div className="flex min-h-[45px] items-center">
					<button
						type="button"
						onClick={() => toggleFolder(folder.id)}
						className="flex flex-1 items-center gap-3 py-2 pl-4 text-left"
					>
						<Icon
							name="folder"
							size={20}
							style={{ color: folderHex(folder.color) }}
						/>
						<span className="flex-1 truncate font-semibold text-title">
							{folder.name}
						</span>
					</button>
					{!folder.collapsed && (
						<button
							type="button"
							onClick={() => addDeck(folder.id)}
							className="px-2 font-medium text-folder-blue"
						>
							Add deck
						</button>
					)}
					<button
						type="button"
						onClick={() => toggleFolder(folder.id)}
						aria-label={folder.collapsed ? "Expand folder" : "Collapse folder"}
						className="flex h-[45px] w-[45px] items-center justify-center"
					>
						<Icon
							name="chevron"
							size={12}
							className="text-body transition-transform"
							style={{ transform: folder.collapsed ? "none" : "rotate(90deg)" }}
						/>
					</button>
				</div>

				{!folder.collapsed &&
					(folderDecks.length > 0 ? (
						<div className="flex flex-col gap-0.5">
							{folderDecks.map((deck) => (
								<DeckRow key={deck.id} deck={deck} />
							))}
						</div>
					) : (
						<p className="px-4 py-2 text-sm text-body">No decks yet.</p>
					))}
			</div>

			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					items={[
						{
							label: "Edit folder",
							icon: "folder",
							onClick: () => {
								setEditing(true);
								close();
							},
						},
						{
							label: "Delete folder",
							icon: "trash",
							danger: true,
							onClick: () => {
								setConfirming(true);
								close();
							},
						},
					]}
				/>
			)}

			{editing && (
				<FlashcardFolderModal folder={folder} onClose={() => setEditing(false)} />
			)}

			{confirming && (
				<ConfirmDialog
					title="Delete folder?"
					message={`"${folder.name}" and all its decks will be deleted.`}
					onConfirm={() => {
						removeFolder(folder.id);
						setConfirming(false);
					}}
					onCancel={() => setConfirming(false)}
				/>
			)}
		</div>
	);
}
