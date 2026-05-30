import { useEffect, useState } from "react";
import { buildMarketplaceLink } from "../features/marketplace/marketplaceLink.js";
import { checkUsername, sendInvite } from "../services/notesService.js";
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

	// Direct share state
	const [inviteUsername, setInviteUsername] = useState("");
	const [usernameState, setUsernameState] = useState(null); // null | "checking" | "found" | "not_found" | string (error)
	const [inviteSending, setInviteSending] = useState(false);
	const [inviteStatus, setInviteStatus] = useState(null); // "sent" | error string

	// Debounced username existence check (available=false means user exists)
	useEffect(() => {
		const trimmed = inviteUsername.trim();
		if (!trimmed) {
			setUsernameState(null);
			return;
		}
		setUsernameState("checking");
		const timer = setTimeout(async () => {
			try {
				const result = await checkUsername(trimmed);
				if (result.error) {
					setUsernameState(result.error);
				} else if (result.available) {
					setUsernameState("not_found");
				} else {
					setUsernameState("found");
				}
			} catch {
				setUsernameState("not_found");
			}
		}, 400);
		return () => clearTimeout(timer);
	}, [inviteUsername]);

	const shareLink = item?.id ? buildMarketplaceLink({ kind, id: item.id }) : "";
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

	async function handleSendInvite() {
		if (usernameState !== "found" || kind !== "note" || !item?.id) return;
		setInviteSending(true);
		setInviteStatus(null);
		try {
			await sendInvite(item.id, inviteUsername.trim());
			setInviteStatus("sent");
			setInviteUsername("");
			setUsernameState(null);
		} catch (e) {
			setInviteStatus(e?.message ?? "Failed to send invite");
		} finally {
			setInviteSending(false);
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

	const sendDisabled = inviteSending || usernameState !== "found";

	return (
		<Modal open onClose={onClose}>
			<h2 className="px-1 text-2xl font-bold text-title">{title}</h2>

			{/* ── Marketplace section ── */}
			<div className="mt-4 flex items-center gap-3">
				<div className="h-px flex-1 border-t-[2px] border-dashed border-border-soft" />
				<span className="text-xs font-semibold uppercase tracking-wide text-body">
					Marketplace
				</span>
				<div className="h-px flex-1 border-t-[2px] border-dashed border-border-soft" />
			</div>

			<p className="mt-2 px-1 text-sm text-body">
				Public {subjectName}s appear in the Marketplace, where other users can
				preview and clone them.
			</p>

			<div className="mt-4 flex items-center justify-between rounded-2xl border-[2.5px] border-border-soft px-4 py-3">
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
				className="mt-4 block px-1 text-sm font-semibold text-title"
			>
				Public description
			</label>
			<textarea
				id="share-desc"
				value={desc}
				onChange={(e) => setDesc(e.target.value)}
				placeholder={`Tell others what's in this ${subjectName}…`}
				rows={3}
				maxLength={280}
				className="mt-2 w-full resize-none rounded-2xl bg-bg-secondary px-4 py-3 text-sm text-title outline-none placeholder:text-body/50"
			/>
			<p className="mt-1 px-1 text-xs text-body">{desc.length}/280</p>

			{isPublic && shareLink && (
				<div className="mt-3 flex flex-col gap-2 rounded-2xl border-[2.5px] border-border-soft bg-bg-secondary p-3">
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
				<p className="mt-2 px-1 text-xs text-body">
					Marketplace listings show your username and avatar — never your email.
				</p>
			)}

			{/* ── Direct share section (notes only) ── */}
			{kind === "note" && (
				<>
					<div className="mt-5 flex items-center gap-3">
						<div className="h-px flex-1 border-t-[2px] border-dashed border-border-soft" />
						<span className="text-xs font-semibold uppercase tracking-wide text-body">
							Direct share
						</span>
						<div className="h-px flex-1 border-t-[2px] border-dashed border-border-soft" />
					</div>
					<p className="mt-2 px-1 text-sm text-body">
						Send this note directly to a colleague — they can view and edit it.
					</p>
					<div className="mt-3 flex gap-2">
						<div className="relative min-w-0 flex-1 flex items-center rounded-2xl bg-bg-secondary px-4">
							<span className="shrink-0 text-sm font-medium text-body">@</span>
							<input
								type="text"
								value={inviteUsername}
								onChange={(e) => {
									setInviteUsername(e.target.value);
									setInviteStatus(null);
								}}
								onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
								placeholder="Username…"
								className="min-w-0 flex-1 bg-transparent py-3 pr-8 text-sm text-title outline-none placeholder:text-body/50"
							/>
							{usernameState === "found" && (
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-folder-green">
									✓
								</span>
							)}
							{usernameState === "not_found" && (
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-folder-red">
									✕
								</span>
							)}
						</div>
						<button
							type="button"
							onClick={handleSendInvite}
							disabled={sendDisabled}
							className="shrink-0 rounded-2xl bg-folder-blue px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
						>
							{inviteSending ? "…" : "Send"}
						</button>
					</div>
					<div className="mt-1 px-1 text-xs">
						{usernameState === "checking" && (
							<span className="text-body">Checking…</span>
						)}
						{usernameState === "not_found" && (
							<span className="text-folder-red">User not found.</span>
						)}
						{typeof usernameState === "string" &&
							usernameState !== "checking" &&
							usernameState !== "found" &&
							usernameState !== "not_found" && (
								<span className="text-folder-red">{usernameState}</span>
							)}
					</div>
					{inviteStatus === "sent" && (
						<p className="mt-1 px-1 text-sm text-folder-green">Invite sent!</p>
					)}
					{inviteStatus && inviteStatus !== "sent" && (
						<p className="mt-1 px-1 text-sm text-folder-red">{inviteStatus}</p>
					)}
				</>
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
