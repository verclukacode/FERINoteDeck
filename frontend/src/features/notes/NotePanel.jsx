import { useEffect, useRef, useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import Icon from "../../components/Icon.jsx";
import ShareModal from "../../components/ShareModal.jsx";
import { getPresence, sendPresence } from "../../services/notesService.js";
import CreateFlashcardsButton from "./CreateFlashcardsButton.jsx";
import CreateFlashcardsModal from "./CreateFlashcardsModal.jsx";
import { useMobileNav } from "./MobileNavContext.jsx";
import NoteChatButton from "./NoteChatButton.jsx";
import NoteChatPanel from "./NoteChatPanel.jsx";
import { useNotes } from "./NotesContext.jsx";
import BlockEditor from "./editor/BlockEditor.jsx";
import { exportNoteToPdf } from "./editor/exportPdf.js";

// Cap what we persist so sessionStorage stays small: keep the most recent
// turns and trim very long individual messages. The model still gets the
// full transcript that's currently in memory; this only bounds what survives
// a page reload.
const CHAT_KEY_PREFIX = "notedeck-chat:";
const CHAT_MAX_MESSAGES = 30;
const CHAT_MAX_CHARS_PER_MSG = 4000;

function loadChat(pageId) {
	if (!pageId || typeof sessionStorage === "undefined") return [];
	try {
		const raw = sessionStorage.getItem(`${CHAT_KEY_PREFIX}${pageId}`);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveChat(pageId, messages) {
	if (!pageId || typeof sessionStorage === "undefined") return;
	const key = `${CHAT_KEY_PREFIX}${pageId}`;
	if (!messages.length) {
		sessionStorage.removeItem(key);
		return;
	}
	const suffix = messages.slice(-CHAT_MAX_MESSAGES).map((m) => ({
		role: m.role,
		content:
			m.content.length > CHAT_MAX_CHARS_PER_MSG
				? m.content.slice(0, CHAT_MAX_CHARS_PER_MSG)
				: m.content,
	}));
	try {
		sessionStorage.setItem(key, JSON.stringify(suffix));
	} catch {
		// Quota or unavailable — drop silently; chat still works in-memory.
	}
}

// Editable page title — Enter (or blur) commits, empty input reverts.
function TitleField({ page, onRename }) {
	const [value, setValue] = useState(page.title);

	const commit = () => {
		const next = value.trim();
		if (next && next !== page.title) onRename(page.id, next);
		else setValue(page.title);
	};

	return (
		<input
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") e.currentTarget.blur();
			}}
			onBlur={commit}
			maxLength={200}
			className="-mx-2 min-w-0 flex-1 truncate rounded-lg bg-transparent px-2 text-xl font-bold text-title outline-none focus:bg-bg-secondary sm:text-3xl"
		/>
	);
}

export default function NotePanel() {
	const {
		selectedPage,
		renamePage,
		updatePageContent,
		updatePageShare,
		pageShares,
		revokeShare,
		sharedPages,
		tier,
	} = useNotes();
	const { openSidebar } = useMobileNav();
	const editorRef = useRef(null);
	const [dirty, setDirty] = useState(false);
	const [sharing, setSharing] = useState(false);
	const [viewers, setViewers] = useState([]);
	const [chatOpen, setChatOpen] = useState(false);
	const [chatMessages, setChatMessages] = useState([]);
	const [moreOpen, setMoreOpen] = useState(false);
	const [flashcardsOpen, setFlashcardsOpen] = useState(false);
	const chatLocked = tier === "basic";
	const flashcardsLocked = tier === "basic";

	useEffect(() => {
		if (!selectedPage?.id) return;
		const pageId = selectedPage.id;

		sendPresence(pageId).catch(() => {});
		getPresence(pageId)
			.then(setViewers)
			.catch(() => {});

		const interval = setInterval(() => {
			sendPresence(pageId).catch(() => {});
			getPresence(pageId)
				.then(setViewers)
				.catch(() => {});
		}, 5000);

		return () => clearInterval(interval);
	}, [selectedPage?.id]);

	useEffect(() => {
		setChatMessages(loadChat(selectedPage?.id));
		setChatOpen(false);
	}, [selectedPage?.id]);

	useEffect(() => {
		saveChat(selectedPage?.id, chatMessages);
	}, [selectedPage?.id, chatMessages]);

	// Only the page owner can share or publish — collaborators (notes shared
	// with me) live in `sharedPages` and get the editor but not the paperplane.
	const isOwner =
		!!selectedPage && !sharedPages.some((p) => p.id === selectedPage.id);

	if (!selectedPage) {
		return (
			<div className="relative flex flex-1 items-center justify-center text-body">
				<button
					type="button"
					aria-label="Open sidebar"
					onClick={openSidebar}
					className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title sm:hidden"
				>
					<Icon name="grip" size={16} />
				</button>
				Select a page to open it.
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-1">
			<div className="relative flex min-w-0 flex-1 flex-col">
				<div className="flex h-[88px] items-center gap-4 border-b-2 border-border-soft px-5">
					<button
						type="button"
						aria-label="Open sidebar"
						onClick={openSidebar}
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title sm:hidden"
					>
						<Icon name="grip" size={16} />
					</button>
					<TitleField
						key={selectedPage.id}
						page={selectedPage}
						onRename={renamePage}
					/>
					{viewers.length > 0 && (
						<div className="hidden items-center sm:flex">
							{viewers.slice(0, 5).map((v, i) => (
								<img
									key={v.username}
									src={v.avatarUrl ?? userProfilePic}
									alt={v.username}
									title={`@${v.username} is viewing`}
									style={{ marginLeft: i === 0 ? 0 : -8 }}
									className="h-8 w-8 rounded-full border-2 border-bg object-cover"
								/>
							))}
						</div>
					)}
					<div className="ml-auto flex shrink-0 items-center gap-2.5">
						<button
							type="button"
							disabled={!dirty}
							onClick={() => editorRef.current?.save()}
							className={`flex h-[45px] shrink-0 items-center rounded-full border-[2.5px] px-4 text-[15px] font-semibold sm:px-5 ${
								dirty
									? "border-folder-blue/15 bg-folder-blue/15 text-folder-blue"
									: "cursor-default border-border-soft bg-bg text-body/40"
							}`}
						>
							{dirty ? "Save" : "Saved"}
						</button>
						{/* Desktop: PDF / Share / Generate */}
						<div className="hidden items-center gap-2.5 sm:flex">
							<button
								type="button"
								onClick={() => exportNoteToPdf(selectedPage)}
								aria-label="Export as PDF"
								className="flex h-[45px] items-center rounded-full border-[2.5px] border-border-soft bg-bg px-4 text-[13px] font-semibold text-title"
							>
								PDF
							</button>
							{isOwner && (
								<button
									type="button"
									onClick={() => setSharing(true)}
									aria-label="Share note"
									className="flex h-[45px] w-[45px] items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title"
								>
									<Icon name="paperplane" size={20} />
								</button>
							)}
							<CreateFlashcardsButton
								page={selectedPage}
								onClick={() => setFlashcardsOpen(true)}
							/>
						</div>
						{/* Mobile: kebab menu collapses PDF / Share / Generate. */}
						<div className="relative shrink-0 sm:hidden">
							<button
								type="button"
								onClick={() => setMoreOpen((v) => !v)}
								aria-label="More actions"
								className="flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title"
							>
								<Icon name="more" size={18} />
							</button>
							{moreOpen && (
								<>
									<button
										type="button"
										aria-label="Close menu"
										onClick={() => setMoreOpen(false)}
										className="fixed inset-0 z-40 cursor-default"
									/>
									<div className="absolute right-0 top-full z-50 mt-2 flex w-52 flex-col overflow-hidden rounded-[18px] border-[2.5px] border-border-soft bg-bg shadow-[0_5px_0_rgba(0,0,0,0.10)]">
										<button
											type="button"
											onClick={() => {
												setMoreOpen(false);
												exportNoteToPdf(selectedPage);
											}}
											className="flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-title hover:bg-bg-secondary"
										>
											Export as PDF
										</button>
										{isOwner && (
											<button
												type="button"
												onClick={() => {
													setMoreOpen(false);
													setSharing(true);
												}}
												className="flex items-center gap-3 border-t-[2px] border-border-soft px-4 py-3 text-left text-sm font-semibold text-title hover:bg-bg-secondary"
											>
												<Icon name="paperplane" size={16} />
												Share note
											</button>
										)}
										<button
											type="button"
											disabled={flashcardsLocked}
											onClick={() => {
												if (flashcardsLocked) return;
												setMoreOpen(false);
												setFlashcardsOpen(true);
											}}
											className={`flex items-center gap-3 border-t-[2px] border-border-soft px-4 py-3 text-left text-sm font-semibold text-folder-purple hover:bg-folder-purple/10 ${
												flashcardsLocked ? "cursor-not-allowed opacity-40" : ""
											}`}
										>
											{flashcardsLocked ? (
												<Icon name="lock" size={14} />
											) : (
												<Icon name="flashcards" size={16} />
											)}
											Generate flashcards
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto overflow-x-hidden py-6">
					<BlockEditor
						key={selectedPage.id}
						ref={editorRef}
						page={selectedPage}
						onChange={updatePageContent}
						onDirtyChange={setDirty}
					/>
				</div>
				<NoteChatButton
					locked={chatLocked}
					open={chatOpen}
					onToggle={() => setChatOpen((v) => !v)}
				/>
			</div>

			{chatOpen && !chatLocked && (
				<NoteChatPanel
					page={selectedPage}
					messages={chatMessages}
					setMessages={setChatMessages}
					onClose={() => setChatOpen(false)}
				/>
			)}

			{sharing && (
				<ShareModal
					kind="note"
					item={selectedPage}
					onSave={(patch) => updatePageShare(selectedPage.id, patch)}
					onClose={() => setSharing(false)}
					sharedWith={pageShares[selectedPage.id] ?? []}
					onRevoke={(inviteId) => revokeShare(inviteId, selectedPage.id)}
				/>
			)}

			{flashcardsOpen && selectedPage && (
				<CreateFlashcardsModal
					page={selectedPage}
					onClose={() => setFlashcardsOpen(false)}
				/>
			)}
		</div>
	);
}
