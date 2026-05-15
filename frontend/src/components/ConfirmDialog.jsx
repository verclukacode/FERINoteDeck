import DuoButton from "./DuoButton.jsx";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
	title,
	message,
	confirmLabel = "Delete",
	onConfirm,
	onCancel,
}) {
	return (
		<Modal open onClose={onCancel}>
			<h2 className="text-xl font-bold text-title">{title}</h2>
			{message && <p className="mt-2 text-body">{message}</p>}
			<DuoButton
				type="button"
				onClick={onConfirm}
				className="mt-6 h-[45px] w-full bg-folder-red text-bg shadow-[0_2.5px_0_#d95a5a]"
			>
				{confirmLabel}
			</DuoButton>
			<button
				type="button"
				onClick={onCancel}
				className="mt-2 w-full py-1 font-medium text-title"
			>
				Cancel
			</button>
		</Modal>
	);
}
