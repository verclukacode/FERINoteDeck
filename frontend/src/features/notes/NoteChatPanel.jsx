import { useEffect, useRef, useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import { chatWithNoteStream } from "../../services/notesService.js";

const INPUT_MAX = 2000;

// Side panel that hosts the OpenAI conversation. Chat history is owned by
// the parent (NoteChatButton) so closing/reopening the panel for the same
// note keeps the conversation; switching notes resets it via a useEffect
// upstream.
export default function NoteChatPanel({
	page,
	messages,
	setMessages,
	onClose,
}) {
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");
	const bottomRef = useRef(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every message/typing change
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages, sending]);

	async function handleSend() {
		const trimmed = input.trim();
		if (!trimmed || sending) return;
		const withUser = [...messages, { role: "user", content: trimmed }];
		setMessages(withUser);
		setInput("");
		setSending(true);
		setError("");
		let acc = "";
		let started = false;
		try {
			await chatWithNoteStream(page.id, withUser, (chunk) => {
				acc += chunk;
				if (!started) {
					started = true;
					setMessages([...withUser, { role: "assistant", content: acc }]);
				} else {
					setMessages([...withUser, { role: "assistant", content: acc }]);
				}
			});
			if (!started) {
				setMessages([
					...withUser,
					{
						role: "assistant",
						content: "(no reply)",
						_error: true,
					},
				]);
			}
		} catch (err) {
			if (err.status === 403) {
				setError("AI chat requires a Pro or Premium account.");
			} else if (err.status === 503) {
				setError("AI chat is not configured on this server.");
			} else {
				setError(err.message ?? "Chat failed");
			}
			setMessages([
				...withUser,
				{
					role: "assistant",
					content: "Sorry — I couldn't reach the AI just now. Try again?",
					_error: true,
				},
			]);
		} finally {
			setSending(false);
		}
	}

	function handleKeyDown(e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	return (
		<div className="chat-panel fixed inset-0 z-40 flex flex-col border-l-[2.5px] border-border-soft bg-bg sm:relative sm:inset-auto sm:z-auto sm:w-[420px] sm:max-w-[90vw] sm:shrink-0">
			{/* Header */}
			<div className="flex items-center gap-3 border-b-[2.5px] border-border-soft px-4 py-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-folder-purple/15 text-folder-purple">
					<Icon name="chat" size={18} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-xs font-semibold uppercase tracking-wide text-body">
						Chatting about
					</p>
					<p className="truncate text-sm font-bold text-title">{page.title}</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close chat"
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-body hover:bg-bg-secondary"
				>
					<Icon name="xmark" size={14} />
				</button>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto px-4 py-4 pr-2">
				{messages.length === 0 && !sending && (
					<div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
						<span className="flex h-12 w-12 items-center justify-center rounded-full bg-folder-purple/10 text-folder-purple">
							<Icon name="chat" size={22} />
						</span>
						<p className="text-sm text-body">
							Ask anything about this note — the AI has it loaded as context.
						</p>
					</div>
				)}

				<div className="flex flex-col gap-3">
					{messages.map((m, i) => (
						<div
							key={`${i}-${m.role}`}
							className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
									m.role === "user"
										? "rounded-br-md bg-folder-purple text-white"
										: m._error
											? "rounded-bl-md bg-folder-red/10 text-folder-red"
											: "rounded-bl-md bg-bg-secondary text-title"
								}`}
							>
								{m.content}
							</div>
						</div>
					))}
					{sending && messages[messages.length - 1]?.role !== "assistant" && (
						<div className="flex justify-start">
							<div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-bg-secondary px-4 py-3">
								<span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-body/60" />
								<span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-body/60" />
								<span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-body/60" />
							</div>
						</div>
					)}
				</div>
				<div ref={bottomRef} />
			</div>

			{error && (
				<p className="px-4 pb-2 text-center text-xs text-folder-red">{error}</p>
			)}

			{/* Footer */}
			<div className="flex items-center gap-2 border-t-[2.5px] border-border-soft p-3">
				<textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Ask anything about this note…"
					rows={2}
					maxLength={INPUT_MAX}
					disabled={sending}
					className="flex-1 resize-none rounded-2xl border-[2.5px] border-border-soft bg-bg-secondary px-3 py-2 text-sm text-title outline-none placeholder:text-body/50 disabled:opacity-60"
				/>
				<DuoButton
					type="button"
					onClick={handleSend}
					disabled={sending || !input.trim()}
					aria-label="Send"
					className="flex h-11 w-11 shrink-0 items-center justify-center bg-folder-purple p-0 text-white shadow-[0_2.5px_0_#5b78dd] disabled:opacity-60"
				>
					<Icon name="paperplane" size={16} />
				</DuoButton>
			</div>
		</div>
	);
}
