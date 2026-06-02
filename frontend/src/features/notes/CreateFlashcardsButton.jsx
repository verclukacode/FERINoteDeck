import { useState } from "react";
import Icon from "../../components/Icon.jsx";
import CreateFlashcardsModal from "./CreateFlashcardsModal.jsx";
import { useNotes } from "./NotesContext.jsx";

// The "Create Flashcards" pill in the NotePanel header. Basic-tier users see
// a locked, dimmed version; Pro/Premium opens the AI generation modal.
export default function CreateFlashcardsButton({ page }) {
	const { tier } = useNotes();
	const [open, setOpen] = useState(false);
	const locked = tier === "basic";
	const disabled = locked || !page;

	return (
		<>
			<button
				type="button"
				disabled={disabled}
				onClick={disabled ? undefined : () => setOpen(true)}
				aria-label={
					locked
						? "Create flashcards (requires Pro or Premium)"
						: "Create flashcards"
				}
				title={locked ? "Available with a Pro or Premium account" : undefined}
				className={`flex h-[45px] items-center gap-2 rounded-full border-[2.5px] border-folder-purple/15 bg-folder-purple/15 px-5 text-[15px] font-semibold text-folder-purple ${
					disabled ? "cursor-not-allowed opacity-40" : ""
				}`}
			>
				{locked && <Icon name="lock" size={16} />}
				<Icon name="flashcards" size={20} />
				Create Flashcards
			</button>
			{open && page && (
				<CreateFlashcardsModal page={page} onClose={() => setOpen(false)} />
			)}
		</>
	);
}
