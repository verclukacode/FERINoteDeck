import { useState } from "react";
import { buildMarketplaceLink } from "../features/marketplace/marketplaceLink.js";
import DuoButton from "./DuoButton.jsx";
import Modal from "./Modal.jsx";

// Generic share toggle + public-description editor used by both notes and decks.
// Parent passes the current item and onSave({ isPublic, publicDescription }).
export default function ShareModal({ kind, item, onSave, onClose }) {
	const [isPublic, setIsPublic] = useState(!!item?.isPublic);
	const [desc, setDesc] = useState(item?.publicDescription ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [linkCopied, setLinkCopied] = useState(false);

	const shareLink = item?.id ? buildMarketplaceLink({ kind, id: item.id }) : "";
	// Toggle was flipped on locally but the change hasn't hit the server yet —
	// the URL is valid, but the link won't resolve until the user hits Save.
	const needsSaveBeforeLinkWorks = isPublic && !item?.isPublic;

	async function copyLink() {
		if (!shareLink) return;
		try {
			await navigator.clipboard.writeText(shareLink);
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 1500);
		} catch {
			setError("Couldn't copy link");
		}
	}

	async function handleSave() {
		setError("");
		setSaving(true);
		try {
			await onSave({
				isPublic,
				publicDescription: desc.trim() || null,
			});
			onClose();
		} catch (e) {
			setError(e?.message ?? "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	const title = kind === "note" ? "Share note" : "Share deck";
	const subjectName = kind === "note" ? "note" : "deck";

	return (
		<Modal open onClose={onClose}>
			<h2 className="px-1 text-2xl font-bold text-title">{title}</h2>
			<p className="mt-1 px-1 text-sm text-body">
				Public {subjectName}s appear in the Marketplace, where other users can
				preview and clone them.
			</p>

			<div className="mt-5 flex items-center justify-between rounded-2xl border-[2.5px] border-border-soft px-4 py-3">
				<span className="font-semibold text-title">Public</span>
				<button
					type="button"
					onClick={() => setIsPublic((v) => !v)}
					aria-pressed={isPublic}
					className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
						isPublic ? "bg-folder-blue" : "bg-border-soft"
					}`}
				>
					<span
						className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-bg shadow transition-transform ${
							isPublic ? "translate-x-5" : "translate-x-0"
						}`}
					/>
				</button>
			</div>

			<label
				htmlFor="share-desc"
				className="mt-5 block px-1 text-sm font-semibold text-title"
			>
				Public description
			</label>
			<textarea
				id="share-desc"
				value={desc}
				onChange={(e) => setDesc(e.target.value)}
				placeholder={`Tell others what's in this ${subjectName}…`}
				rows={4}
				maxLength={280}
				className="mt-2 w-full resize-none rounded-2xl bg-bg-secondary px-4 py-3 text-sm text-title outline-none placeholder:text-body/50"
			/>
			<p className="mt-1 px-1 text-xs text-body">{desc.length}/280</p>

			{isPublic && shareLink && (
				<div className="mt-4 flex flex-col gap-2 rounded-2xl border-[2.5px] border-border-soft bg-bg-secondary p-3">
					<span className="px-1 text-xs font-semibold uppercase tracking-wide text-body">
						Shareable link
					</span>
					<div className="flex items-center gap-2">
						<input
							type="text"
							value={shareLink}
							readOnly
							onFocus={(e) => e.target.select()}
							className="min-w-0 flex-1 truncate rounded-full bg-bg px-3 py-2 text-xs text-title outline-none"
						/>
						<button
							type="button"
							onClick={copyLink}
							className="shrink-0 rounded-full border-[2.5px] border-folder-blue/20 bg-bg px-3 py-2 text-xs font-semibold text-folder-blue"
						>
							{linkCopied ? "Copied!" : "Copy"}
						</button>
					</div>
					{needsSaveBeforeLinkWorks && (
						<p className="px-1 text-xs text-body">
							Save first — the link only works once this {subjectName} is
							published.
						</p>
					)}
				</div>
			)}

			{isPublic && (
				<p className="mt-3 px-1 text-xs text-body">
					Marketplace listings show your username and avatar — never your email.
				</p>
			)}

			{error && (
				<p className="mt-2 text-center text-sm text-folder-red">{error}</p>
			)}

			<DuoButton
				type="button"
				onClick={handleSave}
				disabled={saving}
				className="mt-5 h-[45px] w-full bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
			>
				{saving ? "Saving…" : "Save"}
			</DuoButton>
			<button
				type="button"
				onClick={onClose}
				className="mt-2 w-full py-1 font-medium text-title"
			>
				Cancel
			</button>
		</Modal>
	);
}
