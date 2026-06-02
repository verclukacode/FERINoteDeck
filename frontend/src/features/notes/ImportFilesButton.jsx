import { useState } from "react";
import ImportFilesModal from "./ImportFilesModal.jsx";
import { useNotes } from "./NotesContext.jsx";

export default function ImportFilesButton() {
	const { tier } = useNotes();
	const [open, setOpen] = useState(false);

	// AI import is a Pro/Premium-tier feature. Basic accounts don't see it.
	if (tier === "basic") return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="min-h-[45px] w-full rounded-[22px] border-2 border-dashed border-body/40 font-semibold text-title"
			>
				Import files (AI)
			</button>
			{open && <ImportFilesModal onClose={() => setOpen(false)} />}
		</>
	);
}
