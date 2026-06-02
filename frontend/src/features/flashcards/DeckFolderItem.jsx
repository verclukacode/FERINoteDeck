import { useSortable } from "@dnd-kit/sortable";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import ContextMenu from "../../components/ContextMenu.jsx";
import Icon from "../../components/Icon.jsx";
import { useContextMenu } from "../../hooks/useContextMenu.js";
import { folderHex } from "../../lib/constants.js";
import DeckFolderPreview from "./DeckFolderPreview.jsx";
import DeckPreview from "./DeckPreview.jsx";
import FlashcardFolderModal from "./FlashcardFolderModal.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";
import ImportCsvDialog from "./ImportCsvDialog.jsx";

// Parse a `question;answer;card_type` CSV into card objects the deck API
// accepts. Tolerates trailing newlines, empty lines, and a header row.
// Trims each cell. card_type defaults to "rate" if missing or unrecognised.
function parseCardsCsv(text) {
	const rows = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (!rows.length) return [];

	// Skip header if it literally says question;answer.
	const first = rows[0].toLowerCase();
	const start =
		first.startsWith("question;") && first.includes("answer") ? 1 : 0;

	const cards = [];
	for (let i = start; i < rows.length; i++) {
		const parts = rows[i].split(";").map((p) => p.trim());
		const [question, answer, type] = parts;
		if (!question || !answer) continue;
		const lowerType = (type ?? "").toLowerCase();
		cards.push({
			question,
			answer,
			type: lowerType === "boolean" ? "boolean" : "rate",
		});
	}
	return cards;
}

function DeckRow({ deck }) {
	const { selectedDeckId, selectDeck, removeDeck, resetDeck, deckShares } =
		useFlashcards();
	const shares = !deck.sharedFromDeckId ? (deckShares[deck.id] ?? []) : [];
	const { menu, open, close } = useContextMenu();
	const [confirming, setConfirming] = useState(false);
	const [resetting, setResetting] = useState(false);
	const selected = deck.id === selectedDeckId;
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: deck.id,
		data: { type: "deck", folderId: deck.folderId },
	});

	if (isDragging) {
		return (
			<div ref={setNodeRef} style={{ transition }}>
				<DeckPreview deck={deck} dimmed />
			</div>
		);
	}

	const style = { transform: CSS.Transform.toString(transform), transition };

	return (
		<>
			<button
				ref={setNodeRef}
				style={style}
				type="button"
				onClick={() => selectDeck(deck.id)}
				onContextMenu={open}
				{...attributes}
				{...listeners}
				className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-2 text-left ${
					selected
						? "font-semibold text-title underline"
						: "font-medium text-body hover:bg-bg-secondary"
				}`}
			>
				<Icon name="flashcards" size={20} />
				<span className="truncate">{deck.name}</span>
				{deck.isPublic && (
					<Icon name="store" size={14} className="shrink-0 text-folder-blue" />
				)}
				{deck.sharedFromDeckId && (
					<Icon
						name="paperplane"
						size={14}
						className="shrink-0 text-folder-pink"
					/>
				)}
				{shares.length > 0 && (
					<div className="flex shrink-0 items-center">
						{shares.slice(0, 3).map((inv, i) => (
							<img
								key={inv.id}
								src={inv.recipient?.avatarUrl ?? userProfilePic}
								alt={inv.recipient?.username ?? ""}
								title={`@${inv.recipient?.username ?? ""}`}
								style={{ marginLeft: i === 0 ? 0 : -6 }}
								className="h-5 w-5 rounded-full border-[1.5px] border-bg-secondary object-cover"
							/>
						))}
					</div>
				)}
			</button>

			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					items={[
						{
							label: "Reset deck",
							icon: "study-hat",
							onClick: () => {
								setResetting(true);
								close();
							},
						},
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

			{resetting && (
				<ConfirmDialog
					title="Reset deck?"
					message={`Study progress for all cards in "${deck.name}" will be cleared.`}
					confirmLabel="Reset"
					onConfirm={() => {
						resetDeck(deck.id);
						setResetting(false);
					}}
					onCancel={() => setResetting(false)}
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
	const [csvImport, setCsvImport] = useState(null);
	const csvInputRef = useRef(null);
	const folderDecks = decks.filter(
		(d) => d.folderId === folder.id && !d.sharedFromDeckId,
	);

	async function handleCsvFile(e) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		try {
			const text = await file.text();
			const cards = parseCardsCsv(text);
			if (!cards.length) {
				alert(
					"No valid rows found. Each line must be `question;answer;card_type` (card_type is `rate` or `boolean`).",
				);
				return;
			}
			const baseName = file.name.replace(/\.[^.]+$/, "");
			// Pop the dialog so the user can edit cards + choose destination.
			setCsvImport({ cards, defaultName: baseName || "Imported deck" });
		} catch (err) {
			alert(`CSV import failed: ${err.message ?? err}`);
		}
	}
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: folder.id, data: { type: "folder" } });

	if (isDragging) {
		return (
			<div ref={setNodeRef} style={{ transition }}>
				<DeckFolderPreview folder={folder} dimmed />
			</div>
		);
	}

	const style = { transform: CSS.Transform.toString(transform), transition };

	return (
		<div ref={setNodeRef} style={style}>
			<div
				className={`rounded-[22px] bg-bg ${folder.collapsed ? "" : "pb-2"}`}
				onContextMenu={open}
			>
				<div
					className="flex min-h-[45px] cursor-pointer items-center gap-3 px-4 py-2"
					onClick={() => toggleFolder(folder.id)}
					{...attributes}
					{...listeners}
				>
					<Icon
						name="folder"
						size={20}
						style={{ color: folderHex(folder.color) }}
					/>
					<span className="flex-1 truncate font-semibold text-title">
						{folder.name}
					</span>
					{!folder.collapsed && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								addDeck(folder.id);
							}}
							className="font-medium text-folder-blue"
						>
							Add deck
						</button>
					)}
					<Icon
						name="chevron"
						size={12}
						className="text-body transition-transform"
						style={{ transform: folder.collapsed ? "none" : "rotate(90deg)" }}
					/>
				</div>

				{!folder.collapsed &&
					(folderDecks.length > 0 ? (
						<SortableContext
							items={folderDecks.map((d) => d.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="flex flex-col gap-0.5">
								{folderDecks.map((deck) => (
									<DeckRow key={deck.id} deck={deck} />
								))}
							</div>
						</SortableContext>
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
							label: "Import CSV",
							icon: "document",
							onClick: () => {
								csvInputRef.current?.click();
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

			<input
				ref={csvInputRef}
				type="file"
				accept=".csv,text/csv,text/plain"
				onChange={handleCsvFile}
				className="hidden"
			/>

			{editing && (
				<FlashcardFolderModal
					folder={folder}
					onClose={() => setEditing(false)}
				/>
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

			{csvImport && (
				<ImportCsvDialog
					folderId={folder.id}
					defaultDeckName={csvImport.defaultName}
					initialCards={csvImport.cards}
					onClose={() => setCsvImport(null)}
				/>
			)}
		</div>
	);
}
