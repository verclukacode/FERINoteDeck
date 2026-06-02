import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import { folderHex } from "../../lib/constants.js";
import { importFiles } from "../../services/notesService.js";
import FolderModal from "./FolderModal.jsx";
import { useNotes } from "./NotesContext.jsx";

// Study-hat path lifted from frontend/src/assets/icons/studt_hat.svg, filled
// with a linear gradient that rotates via SMIL so the hat itself stays a hat.
const HAT_PATH =
	"M25.4688 5.03906C26.1426 5.3418 26.4941 5.89844 26.4941 6.47461C26.4941 7.05078 26.1426 7.59766 25.4688 7.91016L15.9277 12.2754C14.9023 12.7441 14.0625 12.959 13.2422 12.9395C12.4219 12.959 11.5918 12.7539 10.5664 12.2754L6.32812 10.3418L12.2852 7.56836C12.5879 7.65625 12.9297 7.70508 13.2812 7.70508C14.3945 7.70508 15.459 7.19727 15.459 6.47461C15.459 5.77148 14.3848 5.26367 13.2812 5.26367C12.168 5.26367 11.084 5.77148 11.084 6.47461C11.084 6.54297 11.1035 6.61133 11.1426 6.66992L4.82422 9.61914L1.02539 7.91016C0.351562 7.59766 0 7.05078 0 6.47461C0 5.89844 0.351562 5.3418 1.02539 5.03906L10.5664 0.673828C11.5918 0.214844 12.4219 0 13.2422 0.00976562C14.0625 0 14.9023 0.214844 15.9277 0.673828L25.4688 5.03906ZM6.29883 11.8848L9.9707 13.5742C11.1523 14.1113 12.2266 14.375 13.2422 14.3652C14.2676 14.375 15.3418 14.1113 16.5234 13.5742L22.8906 10.6445V13.75C22.8906 16.7871 18.9844 19.2578 13.2422 19.2578C10.3906 19.2578 7.98828 18.6426 6.29883 17.627V11.8848ZM3.59375 10.6543L4.86328 11.2402V16.4746C4.05273 15.6152 3.59375 14.5996 3.59375 13.75V10.6543ZM4.01367 19.9512C4.01367 19.3066 4.33594 18.8379 4.86328 18.6621V16.4746C5.25391 16.9043 5.73242 17.2949 6.29883 17.627V18.6621C6.81641 18.8477 7.13867 19.3164 7.13867 19.9512V22.4902C7.13867 23.3105 6.60156 23.8477 5.77148 23.8477H5.38086C4.56055 23.8477 4.01367 23.3105 4.01367 22.4902V19.9512Z";

function RainbowStudyHat() {
	return (
		<svg width="88" height="88" viewBox="0 0 27 24" aria-hidden="true">
			<defs>
				<linearGradient
					id="ai-hat-gradient"
					gradientUnits="userSpaceOnUse"
					x1="0"
					y1="0"
					x2="27"
					y2="24"
				>
					<stop offset="0%" stopColor="#ff70c3" />
					<stop offset="50%" stopColor="#7092ff" />
					<stop offset="100%" stopColor="#499ef3" />
					<animateTransform
						attributeName="gradientTransform"
						type="rotate"
						from="0 13.5 12"
						to="360 13.5 12"
						dur="6s"
						repeatCount="indefinite"
					/>
				</linearGradient>
			</defs>
			<path d={HAT_PATH} fill="url(#ai-hat-gradient)" />
		</svg>
	);
}

// File-kind icon for the floating pills.
function iconForFile(name) {
	const lower = name.toLowerCase();
	if (/\.(png|jpe?g|gif|webp)$/.test(lower)) return "image";
	if (/\.pdf$/.test(lower)) return "document";
	if (/\.docx$/.test(lower)) return "document";
	if (/\.pptx$/.test(lower)) return "document";
	if (/\.(txt|md)$/.test(lower)) return "text";
	return "document";
}

// Fake-but-believable progress while we wait for OpenAI. We can't get true
// streaming progress from one shot of chat.completions, so we step toward
// staged targets — and snap to 100% as soon as the real call resolves.
const STAGES = [
	{ until: 4000, target: 28, label: "Reading your files…" },
	{ until: 11000, target: 58, label: "Looking at the content…" },
	{ until: 22000, target: 82, label: "Composing your note…" },
	{ until: 40000, target: 94, label: "Almost there…" },
];

function MagicalLoader({ files }) {
	const [progress, setProgress] = useState(4);
	const [label, setLabel] = useState(STAGES[0].label);

	useEffect(() => {
		const start = Date.now();
		const tick = setInterval(() => {
			const elapsed = Date.now() - start;
			const stage =
				STAGES.find((s) => elapsed < s.until) ?? STAGES[STAGES.length - 1];
			setLabel(stage.label);
			setProgress((p) =>
				p < stage.target ? Math.min(p + 1, stage.target) : p,
			);
		}, 220);
		return () => clearInterval(tick);
	}, []);

	return (
		<div className="relative flex min-h-[420px] flex-col items-center justify-center gap-6 overflow-hidden px-2 py-8">
			<RainbowStudyHat />

			<h2 className="text-center text-2xl font-bold text-title">
				Conjuring your note
			</h2>

			<div className="flex max-w-[440px] flex-wrap items-center justify-center gap-2">
				{files.map((f, i) => (
					<span
						key={`${f.name}-${i}`}
						className="ai-pill-float flex max-w-[180px] items-center gap-1.5 rounded-full border-[2px] border-folder-purple/20 bg-folder-purple/10 px-3 py-1.5 text-xs font-semibold text-folder-purple shadow-[0_2px_0_rgba(112,146,255,0.15)]"
						style={{ animationDelay: `${(i % 6) * 0.3}s` }}
					>
						<Icon name={iconForFile(f.name)} size={12} />
						<span className="truncate">{f.name}</span>
					</span>
				))}
			</div>

			<p className="text-sm font-medium text-body">{label}</p>

			<div className="w-full max-w-[360px]">
				<div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
					<div
						className="ai-progress-fill h-full rounded-full"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>
		</div>
	);
}

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
			{createPortal(
				<div className="ai-window-halo" aria-hidden="true" />,
				document.body,
			)}
			<Modal
				open
				onClose={generating ? () => {} : onClose}
				className="w-[520px] max-h-[85vh] overflow-y-auto"
			>
				{generating ? (
					<MagicalLoader files={files} />
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
