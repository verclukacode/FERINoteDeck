import { useState } from "react";
import FolderModal from "./FolderModal.jsx";

export default function AddFolderButton() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="min-h-[45px] w-full rounded-[22px] border-2 border-dashed border-body/40 font-semibold text-title"
			>
				Add folder
			</button>
			{open && <FolderModal onClose={() => setOpen(false)} />}
		</>
	);
}
