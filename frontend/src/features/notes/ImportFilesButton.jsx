import { useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import ImportFilesModal from "./ImportFilesModal.jsx";
import { useNotes } from "./NotesContext.jsx";

export default function ImportFilesButton() {
	const { tier } = useNotes();
	const [open, setOpen] = useState(false);

	// AI import is a Pro/Premium-tier feature. Basic accounts see the button
	// in a locked, dimmed state so they know the feature exists.
	const locked = tier === "basic";

	return (
		<>
			<DuoButton
				type="button"
				disabled={locked}
				onClick={locked ? undefined : () => setOpen(true)}
				aria-label={
					locked ? "Generate note (requires Pro or Premium)" : "Generate note"
				}
				title={locked ? "Available with a Pro or Premium account" : undefined}
				className={`flex h-[45px] w-full shrink-0 items-center justify-center gap-2 bg-folder-purple text-white shadow-[0_2.5px_0_#5b78dd] ${locked ? "cursor-not-allowed opacity-40" : ""}`}
			>
				{locked && <Icon name="lock" size={16} />}
				Generate note
			</DuoButton>
			{open && <ImportFilesModal onClose={() => setOpen(false)} />}
		</>
	);
}
