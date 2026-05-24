import { useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Modal from "../../components/Modal.jsx";
import { DEFAULT_FOLDER_COLOR, FOLDER_COLORS } from "../../lib/constants.js";
import { useFlashcards } from "./FlashcardsContext.jsx";

export default function FlashcardFolderModal({ folder, onClose }) {
	const { editFolder } = useFlashcards();
	const [name, setName] = useState(folder.name);
	const [color, setColor] = useState(folder.color ?? DEFAULT_FOLDER_COLOR);

	const submit = (e) => {
		e.preventDefault();
		editFolder(folder.id, { name, color });
		onClose();
	};

	return (
		<Modal open onClose={onClose}>
			<form onSubmit={submit}>
				<h2 className="px-1 text-3xl font-bold text-title">Edit folder</h2>

				<label
					htmlFor="folder-name"
					className="mt-6 block px-1 text-sm font-semibold text-title"
				>
					Folder name
				</label>
				<input
					id="folder-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Name..."
					className="mt-2 h-[45px] w-full rounded-[22.5px] bg-bg-secondary px-5 text-[17px] text-title outline-none placeholder:text-body/50"
				/>

				<p className="mt-5 px-1 text-sm font-semibold text-title">Color</p>
				<div className="mt-2 flex justify-between">
					{FOLDER_COLORS.map((c) => {
						const selected = color === c.key;
						return (
							<button
								key={c.key}
								type="button"
								onClick={() => setColor(c.key)}
								className="flex h-[45px] w-[45px] items-center justify-center rounded-full"
								style={{
									backgroundColor: c.hex,
									border: selected ? "none" : "2.5px solid rgba(0,0,0,0.15)",
								}}
							>
								{selected && (
									<span className="h-[18px] w-[18px] rounded-full bg-bg" />
								)}
							</button>
						);
					})}
				</div>

				<DuoButton
					type="submit"
					className="mt-8 h-[45px] w-full bg-body text-bg shadow-[0_2.5px_0_#5b5b5b]"
				>
					Save
				</DuoButton>
				<button
					type="button"
					onClick={onClose}
					className="mt-3 w-full text-[17px] font-semibold text-title"
				>
					Cancel
				</button>
			</form>
		</Modal>
	);
}
