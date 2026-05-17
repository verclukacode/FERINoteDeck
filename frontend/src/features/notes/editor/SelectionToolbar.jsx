// Floating "Bold" button shown above an active text selection.
export default function SelectionToolbar({ rect, onBold }) {
	if (!rect) return null;
	return (
		<div
			className="fixed z-40 -translate-x-1/2 -translate-y-full"
			style={{ left: rect.left + rect.width / 2, top: rect.top - 6 }}
		>
			<button
				type="button"
				// Keep the editor selection while clicking the toolbar.
				onMouseDown={(e) => {
					e.preventDefault();
					onBold();
				}}
				className="rounded-lg border-[2.5px] border-border-soft bg-bg px-3 py-1 font-bold text-title shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
			>
				B
			</button>
		</div>
	);
}
