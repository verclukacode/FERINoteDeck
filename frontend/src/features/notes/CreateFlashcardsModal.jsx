import { useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import { folderHex } from "../../lib/constants.js";
import {
	createDeck,
	generateDeckFromNote,
} from "../../services/flashcardsService.js";
import FlashcardFolderModal from "../flashcards/FlashcardFolderModal.jsx";
import { useFlashcards } from "../flashcards/FlashcardsContext.jsx";
import MagicalLoader, { ModalHalo } from "./ai/MagicalLoader.jsx";
import RainbowIcon, { FLASHCARDS } from "./ai/RainbowIcon.jsx";

// Three-phase modal mirroring ImportFilesModal: intro → magical loader →
// review/save. The note's content drives the OpenAI call; the deck takes
// the note's title verbatim, so all the user picks at the end is the
// flashcard folder.
export default function CreateFlashcardsModal({ page, onClose }) {
	const flashcards = useFlashcards();
	const folders = flashcards.folders;
	const addDeckFromClone = flashcards.addDeckFromClone;

	const [phase, setPhase] = useState("intro"); // intro | generating | review
	const [error, setError] = useState("");
	const [generated, setGenerated] = useState(null); // { title, cards }
	const [folderId, setFolderId] = useState(folders[0]?.id ?? null);
	const [creatingFolder, setCreatingFolder] = useState(false);
	const [saving, setSaving] = useState(false);

	async function handleGenerate() {
		setError("");
		setPhase("generating");
		try {
			const res = await generateDeckFromNote(page.id);
			if (!res.cards?.length) {
				setError("The AI couldn't extract any flashcards from this note.");
				setPhase("intro");
				return;
			}
			setGenerated(res);
			setPhase("review");
		} catch (err) {
			if (err.status === 403) {
				setError("Flashcard generation requires a Pro or Premium account.");
			} else if (err.status === 503) {
				setError("AI generation is not configured on this server.");
			} else {
				setError(err.message ?? "Generation failed");
			}
			setPhase("intro");
		}
	}

	async function handleSave() {
		if (!folderId || !generated) return;
		setSaving(true);
		try {
			const result = await createDeck({
				folderId,
				name: generated.title,
				cards: generated.cards,
			});
			// Backend returns { deck, cards } when cards[] was provided.
			addDeckFromClone({
				deck: result.deck,
				cards: result.cards ?? [],
			});
			onClose();
		} catch (err) {
			setError(err.message ?? "Save failed");
		} finally {
			setSaving(false);
		}
	}

	const generating = phase === "generating";

	return (
		<>
			<ModalHalo />
			<Modal
				open
				onClose={generating ? () => {} : onClose}
				className="w-[520px] max-h-[85vh] overflow-y-auto"
			>
				{phase === "generating" ? (
					<MagicalLoader
						icon={
							<RainbowIcon
								viewBox={FLASHCARDS.viewBox}
								path={FLASHCARDS.path}
								gradientId="ai-deck-gradient"
							/>
						}
						title="Conjuring your deck"
						items={[{ name: page.title || "Untitled note", icon: "document" }]}
					/>
				) : phase === "intro" ? (
					<>
						<div className="flex flex-col items-center gap-3 px-1 pt-2 text-center">
							<Icon
								name="flashcards"
								size={36}
								className="text-folder-purple"
							/>
							<h2 className="text-2xl font-bold text-title">
								Create Flashcards
							</h2>
						</div>

						<p className="mt-5 px-1 text-sm text-body">
							The contents of{" "}
							<span className="font-semibold text-title">"{page.title}"</span>{" "}
							will be sent to the AI, which will produce a flashcard deck — one
							card per important concept, in the note's language.
						</p>
						<p className="mt-3 px-1 text-sm text-body">
							When it's done, you'll pick which flashcards folder the new deck
							should land in. The deck's name will match this note's title.
						</p>

						{error && (
							<p className="mt-3 text-center text-sm text-folder-red">
								{error}
							</p>
						)}

						<DuoButton
							type="button"
							onClick={handleGenerate}
							className="mt-5 h-[45px] w-full bg-folder-purple text-white shadow-[0_2.5px_0_#5b78dd]"
						>
							Generate
						</DuoButton>
						<button
							type="button"
							onClick={onClose}
							className="mt-2 w-full py-1 font-medium text-title"
						>
							Cancel
						</button>
					</>
				) : (
					<>
						<h2 className="px-1 text-2xl font-bold text-title">Save deck</h2>
						<p className="mt-1 px-1 text-sm text-body">
							{generated.cards.length} card
							{generated.cards.length === 1 ? "" : "s"} ready. Pick a folder for{" "}
							<span className="font-semibold text-title">
								"{generated.title}"
							</span>
							.
						</p>

						<p className="mt-4 px-1 text-sm font-semibold text-title">Folder</p>
						<div className="mt-2 flex max-h-[220px] flex-col gap-2 overflow-y-auto">
							<button
								type="button"
								onClick={() => setCreatingFolder(true)}
								className="flex items-center gap-3 rounded-2xl border-[2.5px] border-dashed border-body/40 px-4 py-3 text-left text-folder-purple hover:bg-bg-secondary"
							>
								<Icon name="plus" size={18} />
								<span className="flex-1 font-semibold">New folder</span>
							</button>
							{folders.map((f) => (
								<button
									key={f.id}
									type="button"
									onClick={() => setFolderId(f.id)}
									className={`flex items-center gap-3 rounded-2xl border-[2.5px] px-4 py-3 text-left ${
										folderId === f.id
											? "border-folder-purple bg-folder-purple/15"
											: "border-border-soft hover:bg-bg-secondary"
									}`}
								>
									<Icon
										name="folder"
										size={20}
										style={{ color: folderHex(f.color) }}
									/>
									<span className="flex-1 truncate font-medium text-title">
										{f.name}
									</span>
								</button>
							))}
						</div>

						{error && (
							<p className="mt-3 text-center text-sm text-folder-red">
								{error}
							</p>
						)}

						<DuoButton
							type="button"
							onClick={handleSave}
							disabled={saving || !folderId}
							className="mt-5 h-[45px] w-full bg-folder-purple text-white shadow-[0_2.5px_0_#5b78dd] disabled:opacity-60"
						>
							{saving ? "Saving…" : "Save deck"}
						</DuoButton>
						<button
							type="button"
							onClick={onClose}
							className="mt-2 w-full py-1 font-medium text-title"
						>
							Cancel
						</button>
					</>
				)}
			</Modal>
			{creatingFolder && (
				<FlashcardFolderModal
					onClose={() => setCreatingFolder(false)}
					onCreated={(folder) => {
						setCreatingFolder(false);
						setFolderId(folder.id);
					}}
				/>
			)}
		</>
	);
}
