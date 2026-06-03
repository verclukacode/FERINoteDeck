import { useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import { useNotes } from "../notes/NotesContext.jsx";
import GenerateTestModal from "./GenerateTestModal.jsx";

export default function GenerateTestButton() {
	const { tier } = useNotes();
	const [open, setOpen] = useState(false);

	const locked = tier === "basic";

	return (
		<>
			<DuoButton
				type="button"
				disabled={locked}
				onClick={locked ? undefined : () => setOpen(true)}
				aria-label={
					locked ? "Generate test (requires Pro or Premium)" : "Generate test"
				}
				title={locked ? "Available with a Pro or Premium account" : undefined}
				className={`flex h-[45px] w-full items-center justify-center gap-2 bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] ${locked ? "cursor-not-allowed opacity-40" : ""}`}
			>
				{locked && <Icon name="lock" size={16} />}
				Generate test
			</DuoButton>
			{open && <GenerateTestModal onClose={() => setOpen(false)} />}
		</>
	);
}
