import { useEffect, useRef, useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import Icon from "../../components/Icon.jsx";
import ShareModal from "../../components/ShareModal.jsx";
import { getPresence, sendPresence } from "../../services/notesService.js";
import CreateFlashcardsButton from "./CreateFlashcardsButton.jsx";
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
			className="-mx-2 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-3xl font-bold text-title outline-none focus:bg-bg-secondary"
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
	const editorRef = useRef(null);
	const [dirty, setDirty] = useState(false);
	const [sharing, setSharing] = useState(false);
	const [viewers, setViewers] = useState([]);
	const [chatOpen, setChatOpen] = useState(false);
	const [chatMessages, setChatMessages] = useState([]);
	const chatLocked = tier === "basic";

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
			<div className="flex flex-1 items-center justify-center text-body">
				Select a page to open it.
			</div>
		);
	}

	return (
		<div className="flex flex-1">
			<div className="relative flex min-w-0 flex-1 flex-col">
				<div className="flex h-[88px] items-center gap-4 border-b-2 border-border-soft px-5">
					<TitleField
						key={selectedPage.id}
						page={selectedPage}
						onRename={renamePage}
					/>
					{viewers.length > 0 && (
						<div className="flex items-center">
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
					<div className="flex items-center gap-2.5">
						<button
							type="button"
							disabled={!dirty}
							onClick={() => editorRef.current?.save()}
							className={`flex h-[45px] items-center rounded-full border-[2.5px] px-5 text-[15px] font-semibold ${
								dirty
									? "border-folder-blue/15 bg-folder-blue/15 text-folder-blue"
									: "cursor-default border-border-soft bg-bg text-body/40"
							}`}
						>
							{dirty ? "Save" : "Saved"}
						</button>
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
						<CreateFlashcardsButton page={selectedPage} />
					</div>
				</div>
				<div className="flex-1 overflow-y-auto py-6">
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
		</div>
	);
}
