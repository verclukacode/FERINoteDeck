import { useState } from "react";
import ImportFilesModal from "./ImportFilesModal.jsx";

export default function ImportFilesButton() {
	const [open, setOpen] = useState(false);

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
