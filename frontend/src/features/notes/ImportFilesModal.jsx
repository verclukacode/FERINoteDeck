import { useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import { folderHex } from "../../lib/constants.js";
import { importFiles } from "../../services/notesService.js";
import FolderModal from "./FolderModal.jsx";
import { useNotes } from "./NotesContext.jsx";
import MagicalLoader, { ModalHalo } from "./ai/MagicalLoader.jsx";
import RainbowIcon, { STUDY_HAT } from "./ai/RainbowIcon.jsx";

const PROMPT_MAX = 1500;
const FILE_MAX_BYTES = 10 * 1024 * 1024;
const TOTAL_MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTS = [
	".pdf",
	".docx",
	".pptx",
	".txt",
	".md",
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
];

function formatBytes(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function hasAllowedExt(name) {
	const lower = name.toLowerCase();
	return ALLOWED_EXTS.some((ext) => lower.endsWith(ext));
}

export default function ImportFilesModal({ onClose }) {
	const { folders, addPage } = useNotes();

	// Phase 1 (collect)
	const [files, setFiles] = useState([]);
	const [prompt, setPrompt] = useState("");
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState("");

	// Phase 2 (review + save)
	const [generated, setGenerated] = useState(null); // { title, content }
	const [title, setTitle] = useState("");
	const [folderId, setFolderId] = useState(folders[0]?.id ?? null);
	const [saving, setSaving] = useState(false);
	const [creatingFolder, setCreatingFolder] = useState(false);

	const totalBytes = files.reduce((s, f) => s + f.size, 0);
	const overTotal = totalBytes > TOTAL_MAX_BYTES;

	function handlePick(e) {
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
			// Dedup by name + size
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
		if (!files.length) return;
		setError("");
		setGenerating(true);
		try {
			const res = await importFiles({ files, prompt });
			setGenerated(res);
			setTitle(res.title);
		} catch (err) {
			if (err.status === 403) {
				setError("AI import requires a Pro or Premium account.");
			} else if (err.status === 503) {
				setError("AI import is not configured on this server.");
			} else {
				setError(err.message ?? "Import failed");
			}
		} finally {
			setGenerating(false);
		}
	}

	async function handleSave() {
		if (!folderId) return;
		setSaving(true);
		try {
			await addPage({ folderId, title, content: generated.content });
			onClose();
		} catch (err) {
			setError(err.message ?? "Save failed");
		} finally {
			setSaving(false);
		}
	}

	const generateDisabled = generating || !files.length || overTotal;

	return (
		<>
			<ModalHalo />
			<Modal
				open
				onClose={generating ? () => {} : onClose}
				className="w-[520px] max-h-[85vh] overflow-y-auto"
			>
				{generating ? (
					<MagicalLoader
						icon={
							<RainbowIcon
								viewBox={STUDY_HAT.viewBox}
								path={STUDY_HAT.path}
								gradientId="ai-hat-gradient"
							/>
						}
						title="Conjuring your note"
						items={files.map((f) => ({ name: f.name }))}
					/>
				) : !generated ? (
					<>
						<h2 className="px-1 text-2xl font-bold text-title">
							Import files with AI
						</h2>
						<p className="mt-1 px-1 text-sm text-body">
							Upload PDFs, slides, docs, text, or images. The AI turns them into
							a single NoteDeck note.
						</p>

						<label
							htmlFor="ai-import-files"
							className="mt-4 block w-full cursor-pointer rounded-2xl border-2 border-dashed border-body/40 px-4 py-3 text-center font-semibold text-title"
						>
							Choose files
							<input
								id="ai-import-files"
								type="file"
								multiple
								accept=".pdf,.docx,.pptx,.txt,.md,image/*"
								onChange={handlePick}
								className="hidden"
							/>
						</label>

						{files.length > 0 && (
							<ul className="mt-3 flex max-h-[180px] flex-col gap-1 overflow-y-auto pr-1">
								{files.map((f, i) => (
									<li
										key={`${f.name}-${f.size}-${i}`}
										className="flex items-center gap-2 rounded-xl bg-bg-secondary px-3 py-2 text-sm"
									>
										<span className="truncate flex-1 text-title">{f.name}</span>
										<span className="shrink-0 text-xs text-body">
											{formatBytes(f.size)}
										</span>
										<button
											type="button"
											onClick={() => removeFile(i)}
											aria-label="Remove file"
											className="shrink-0 px-1 text-body"
										>
											×
										</button>
									</li>
								))}
							</ul>
						)}

						{files.length > 0 && (
							<p
								className={`mt-2 px-1 text-xs ${overTotal ? "text-folder-red" : "text-body"}`}
							>
								{formatBytes(totalBytes)} / 20 MB total
							</p>
						)}

						<label
							htmlFor="ai-import-prompt"
							className="mt-4 flex items-baseline gap-2 px-1"
						>
							<span className="text-sm font-semibold text-title">
								Additional prompt
							</span>
							<span className="text-xs font-medium text-body">optional</span>
						</label>
						<textarea
							id="ai-import-prompt"
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder="Leave empty for a balanced summary, or tell the AI how to shape the note — e.g. 'organise by topic, focus on the exam material'."
							rows={3}
							maxLength={PROMPT_MAX}
							className="mt-2 w-full resize-none rounded-2xl bg-bg-secondary px-4 py-3 text-sm text-title outline-none placeholder:text-body/50"
						/>
						<p
							className={`mt-1 px-1 text-xs ${prompt.length >= PROMPT_MAX ? "text-folder-red" : "text-body"}`}
						>
							{prompt.length}/{PROMPT_MAX}
						</p>

						{error && (
							<p className="mt-3 text-center text-sm text-folder-red">
								{error}
							</p>
						)}

						<DuoButton
							type="button"
							onClick={handleGenerate}
							disabled={generateDisabled}
							className="mt-5 h-[45px] w-full bg-folder-purple text-white shadow-[0_2.5px_0_#5b78dd] disabled:opacity-60"
						>
							{generating ? "OpenAI is reading your files…" : "Generate"}
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
						<h2 className="px-1 text-2xl font-bold text-title">
							Save imported note
						</h2>

						<label
							htmlFor="ai-import-title"
							className="mt-4 block px-1 text-sm font-semibold text-title"
						>
							Title
						</label>
						<input
							id="ai-import-title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={200}
							className="mt-2 w-full rounded-2xl bg-bg-secondary px-4 py-3 text-sm text-title outline-none"
						/>

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
							disabled={saving || !folderId || !title.trim()}
							className="mt-5 h-[45px] w-full bg-folder-purple text-white shadow-[0_2.5px_0_#5b78dd] disabled:opacity-60"
						>
							{saving ? "Saving…" : "Save note"}
						</DuoButton>
						<button
							type="button"
							onClick={() => setGenerated(null)}
							className="mt-2 w-full py-1 font-medium text-title"
						>
							Back
						</button>
					</>
				)}
			</Modal>
			{creatingFolder && (
				<FolderModal
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
