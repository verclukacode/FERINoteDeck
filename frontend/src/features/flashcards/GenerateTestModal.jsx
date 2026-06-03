import { useRef, useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import { generateTestDeck } from "../../services/flashcardsService.js";
import { useNotes } from "../notes/NotesContext.jsx";
import MagicalLoader, { ModalHalo } from "../notes/ai/MagicalLoader.jsx";
import RainbowIcon, { FLASHCARDS } from "../notes/ai/RainbowIcon.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";

const FILE_MAX_BYTES = 10 * 1024 * 1024;
const TOTAL_MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTS = [".pdf", ".docx", ".pptx", ".txt", ".md"];

function hasAllowedExt(name) {
	return ALLOWED_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
}

function formatBytes(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function GenerateTestModal({ onClose }) {
	const { pages } = useNotes();
	const { decks, addTestDeck } = useFlashcards();
	const ownedDecks = decks.filter((d) => !d.sharedFromDeckId && !d.isTest);

	const [phase, setPhase] = useState("select"); // select | generating | done
	const [selectedPageIds, setSelectedPageIds] = useState([]);
	const [selectedDeckIds, setSelectedDeckIds] = useState([]);
	const [files, setFiles] = useState([]);
	const [error, setError] = useState("");
	const [result, setResult] = useState(null); // { deck, cards, folder? }
	const fileInputRef = useRef(null);

	const totalBytes = files.reduce((s, f) => s + f.size, 0);
	const overTotal = totalBytes > TOTAL_MAX_BYTES;
	const nothingSelected =
		selectedPageIds.length === 0 &&
		selectedDeckIds.length === 0 &&
		files.length === 0;

	function togglePage(id) {
		setSelectedPageIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	}

	function toggleDeck(id) {
		setSelectedDeckIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	}

	function handleFilePick(e) {
		const picked = Array.from(e.target.files ?? []);
		const next = [...files];
		for (const f of picked) {
			if (!hasAllowedExt(f.name)) {
				setError(`Unsupported file: ${f.name}`);
				continue;
			}
			if (f.size > FILE_MAX_BYTES) {
				setError(`${f.name} exceeds 10 MB`);
				continue;
			}
			if (next.some((g) => g.name === f.name && g.size === f.size)) continue;
			next.push(f);
		}
		setFiles(next);
		e.target.value = "";
	}

	function removeFile(idx) {
		setFiles((prev) => prev.filter((_, i) => i !== idx));
	}

	async function handleGenerate() {
		setError("");
		setPhase("generating");
		try {
			const fd = new FormData();
			fd.append("pageIds", JSON.stringify(selectedPageIds));
			fd.append("deckIds", JSON.stringify(selectedDeckIds));
			for (const f of files) fd.append("files", f);

			const data = await generateTestDeck(fd);
			addTestDeck(data);
			setResult(data);
			setPhase("done");
		} catch (err) {
			if (err.status === 403) {
				setError("Test generation requires a Pro or Premium account.");
			} else if (err.status === 503) {
				setError("AI generation is not configured on this server.");
			} else {
				setError(err.message ?? "Generation failed");
			}
			setPhase("select");
		}
	}

	const loaderItems = [
		...selectedPageIds.map((id) => ({
			name: pages.find((p) => p.id === id)?.title || "Note",
			icon: "document",
		})),
		...selectedDeckIds.map((id) => ({
			name: decks.find((d) => d.id === id)?.name || "Deck",
			icon: "flashcards",
		})),
		...files.map((f) => ({ name: f.name, icon: "document" })),
	];

	return (
		<>
			<ModalHalo />
			<Modal
				open
				onClose={phase === "generating" ? () => {} : onClose}
				className="w-[520px] max-h-[85vh] overflow-y-auto"
			>
				{phase === "generating" ? (
					<MagicalLoader
						icon={
							<RainbowIcon
								viewBox={FLASHCARDS.viewBox}
								path={FLASHCARDS.path}
								gradientId="ai-test-gradient"
							/>
						}
						title="Generating your test deck"
						items={loaderItems}
					/>
				) : phase === "done" ? (
					<>
						<div className="flex flex-col items-center gap-3 px-1 pt-2 text-center">
							<Icon name="flashcards" size={36} className="text-folder-blue" />
							<h2 className="text-2xl font-bold text-title">
								Test deck ready!
							</h2>
						</div>
						<p className="mt-4 px-1 text-sm text-body text-center">
							<span className="font-semibold text-title">
								"{result?.deck?.name}"
							</span>{" "}
							was saved with{" "}
							<span className="font-semibold text-title">
								{result?.cards?.length ?? 0} card
								{(result?.cards?.length ?? 0) === 1 ? "" : "s"}
							</span>{" "}
							to your <span className="font-semibold text-title">Tests</span>{" "}
							section.
						</p>
						<DuoButton
							type="button"
							onClick={onClose}
							className="mt-6 h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf]"
						>
							Done
						</DuoButton>
					</>
				) : (
					<>
						<div className="flex flex-col items-center gap-3 px-1 pt-2 text-center">
							<Icon name="flashcards" size={36} className="text-folder-blue" />
							<h2 className="text-2xl font-bold text-title">
								Generate Test Deck
							</h2>
						</div>
						<p className="mt-3 px-1 text-sm text-body">
							Pick notes and/or upload files. The AI will combine them into a
							single test deck saved to your{" "}
							<span className="font-semibold text-title">Tests</span> section.
						</p>

						{/* Notes picker */}
						{pages.length > 0 && (
							<>
								<p className="mt-5 px-1 text-sm font-semibold text-title">
									Notes
								</p>
								<div className="mt-2 flex max-h-[200px] flex-col gap-1 overflow-y-auto">
									{pages.map((p) => {
										const checked = selectedPageIds.includes(p.id);
										return (
											<button
												key={p.id}
												type="button"
												onClick={() => togglePage(p.id)}
												className={`flex items-center gap-3 rounded-2xl border-[2.5px] px-4 py-2.5 text-left text-sm ${
													checked
														? "border-folder-blue bg-folder-blue/10 font-semibold text-title"
														: "border-border-soft font-medium text-body hover:bg-bg-secondary"
												}`}
											>
												<Icon
													name={checked ? "checkbox" : "document"}
													size={16}
													className={checked ? "text-folder-blue" : "text-body"}
												/>
												<span className="flex-1 truncate">
													{p.title || "Untitled"}
												</span>
											</button>
										);
									})}
								</div>
							</>
						)}

						{/* Decks picker */}
						{ownedDecks.length > 0 && (
							<>
								<p className="mt-5 px-1 text-sm font-semibold text-title">
									Flashcard decks
								</p>
								<div className="mt-2 flex max-h-[200px] flex-col gap-1 overflow-y-auto">
									{ownedDecks.map((d) => {
										const checked = selectedDeckIds.includes(d.id);
										return (
											<button
												key={d.id}
												type="button"
												onClick={() => toggleDeck(d.id)}
												className={`flex items-center gap-3 rounded-2xl border-[2.5px] px-4 py-2.5 text-left text-sm ${
													checked
														? "border-folder-blue bg-folder-blue/10 font-semibold text-title"
														: "border-border-soft font-medium text-body hover:bg-bg-secondary"
												}`}
											>
												<Icon
													name={checked ? "checkbox" : "flashcards"}
													size={16}
													className={checked ? "text-folder-blue" : "text-body"}
												/>
												<span className="flex-1 truncate">{d.name}</span>
											</button>
										);
									})}
								</div>
							</>
						)}

						{/* File upload */}
						<p className="mt-5 px-1 text-sm font-semibold text-title">
							Files{" "}
							<span className="font-normal text-body">
								(PDF, DOCX, PPTX, TXT, MD)
							</span>
						</p>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept={ALLOWED_EXTS.join(",")}
							className="hidden"
							onChange={handleFilePick}
						/>
						{files.length > 0 && (
							<div className="mt-2 flex flex-col gap-1 max-h-[120px] overflow-y-auto">
								{files.map((f, i) => (
									<div
										key={`${f.name}-${f.size}`}
										className="flex items-center gap-2 rounded-xl border border-border-soft px-3 py-2 text-sm"
									>
										<Icon
											name="document"
											size={14}
											className="shrink-0 text-body"
										/>
										<span className="flex-1 truncate text-title">{f.name}</span>
										<span className="text-xs text-body">
											{formatBytes(f.size)}
										</span>
										<button
											type="button"
											onClick={() => removeFile(i)}
											className="text-body hover:text-folder-red"
										>
											<Icon name="xmark" size={12} />
										</button>
									</div>
								))}
							</div>
						)}
						{overTotal && (
							<p className="mt-1 text-xs text-folder-red">
								Total exceeds 20 MB
							</p>
						)}
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="mt-2 flex items-center gap-2 rounded-xl border-2 border-dashed border-body/40 px-4 py-2.5 text-sm font-semibold text-body hover:bg-bg-secondary w-full"
						>
							<Icon name="plus" size={14} />
							Add files
						</button>

						{error && (
							<p className="mt-3 text-center text-sm text-folder-red">
								{error}
							</p>
						)}

						<DuoButton
							type="button"
							onClick={handleGenerate}
							disabled={nothingSelected || overTotal}
							className="mt-5 h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-50"
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
				)}
			</Modal>
		</>
	);
}
