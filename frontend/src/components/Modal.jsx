import { useEffect } from "react";

export default function Modal({ open, onClose, children }) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 bg-black/15"
			/>
			<div className="relative w-[389px] rounded-[30px] border-[2.5px] border-border-soft bg-bg p-5 shadow-[0_5px_0_rgba(0,0,0,0.15)]">
				{children}
			</div>
		</div>
	);
}
