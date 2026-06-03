import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";

// Floating Duolingo-style chat button anchored to the bottom-right of the
// editor column. Pure UI — chat state (open + messages) lives in NotePanel
// so the panel can render as a flex sibling beside the editor.
export default function NoteChatButton({ locked, open, onToggle }) {
	return (
		<div className="absolute bottom-6 right-6 z-20">
			<DuoButton
				type="button"
				disabled={locked}
				onClick={locked ? undefined : onToggle}
				aria-label={
					locked
						? "Chat about this note (requires Pro or Premium)"
						: open
							? "Close chat"
							: "Chat about this note"
				}
				title={locked ? "Available with a Pro or Premium account" : undefined}
				className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-folder-purple p-0 text-white shadow-[0_2.5px_0_#5b78dd] ${
					locked ? "cursor-not-allowed opacity-40 active:translate-y-0" : ""
				}`}
			>
				<Icon name="chat" size={24} />
				{locked && (
					<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-[2.5px] border-bg bg-folder-purple text-white">
						<Icon name="lock" size={10} />
					</span>
				)}
			</DuoButton>
		</div>
	);
}
