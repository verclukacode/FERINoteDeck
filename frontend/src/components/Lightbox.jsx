import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

// Full-screen image preview with zoom (wheel + buttons + double-click) and
// pan-by-drag when zoomed in. Close with the X, the backdrop, or Esc.
export default function Lightbox({ src, alt, onClose }) {
	const [scale, setScale] = useState(1);
	const [pos, setPos] = useState({ x: 0, y: 0 });
	const dragRef = useRef(null);

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	const reset = () => {
		setScale(1);
		setPos({ x: 0, y: 0 });
	};

	const zoomBy = (delta) =>
		setScale((s) => Math.max(0.5, Math.min(8, s + delta)));

	const onWheel = (e) => {
		zoomBy(-e.deltaY * 0.002);
	};

	const onPointerDown = (e) => {
		if (scale <= 1) return;
		dragRef.current = {
			x: e.clientX,
			y: e.clientY,
			startX: pos.x,
			startY: pos.y,
		};
		e.currentTarget.setPointerCapture?.(e.pointerId);
	};

	const onPointerMove = (e) => {
		const d = dragRef.current;
		if (!d) return;
		setPos({
			x: d.startX + (e.clientX - d.x),
			y: d.startY + (e.clientY - d.y),
		});
	};

	const onPointerUp = (e) => {
		dragRef.current = null;
		e.currentTarget.releasePointerCapture?.(e.pointerId);
	};

	const toggleZoom = () => {
		if (scale === 1) setScale(2.5);
		else reset();
	};

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
			onWheel={onWheel}
		>
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 cursor-zoom-out"
			/>

			<img
				src={src}
				alt={alt}
				draggable={false}
				onDoubleClick={toggleZoom}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				style={{
					transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
					cursor: scale > 1 ? "grab" : "zoom-in",
				}}
				className="relative max-h-[90vh] max-w-[90vw] touch-none select-none transition-transform"
			/>

			<div className="absolute right-5 top-5 flex items-center gap-2">
				<button
					type="button"
					onClick={() => zoomBy(-0.5)}
					className="flex h-9 w-9 items-center justify-center rounded-full bg-bg/90 font-bold text-title hover:bg-bg"
					aria-label="Zoom out"
				>
					−
				</button>
				<button
					type="button"
					onClick={reset}
					className="rounded-full bg-bg/90 px-3 py-1 text-sm font-semibold text-title hover:bg-bg"
				>
					{Math.round(scale * 100)}%
				</button>
				<button
					type="button"
					onClick={() => zoomBy(0.5)}
					className="flex h-9 w-9 items-center justify-center rounded-full bg-bg/90 font-bold text-title hover:bg-bg"
					aria-label="Zoom in"
				>
					+
				</button>
				<button
					type="button"
					onClick={onClose}
					className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-bg/90 text-title hover:bg-bg"
					aria-label="Close"
				>
					<Icon name="xmark" size={14} />
				</button>
			</div>
		</div>
	);
}
