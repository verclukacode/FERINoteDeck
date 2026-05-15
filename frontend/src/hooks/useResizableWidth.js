import { useCallback, useEffect, useRef, useState } from "react";

// Tracks a width that the user can change by dragging a handle.
// `ref` goes on the resized element; `startResize` on the drag handle.
export function useResizableWidth({ initial, min, max, storageKey }) {
	const [width, setWidth] = useState(() => {
		const saved = storageKey ? Number(localStorage.getItem(storageKey)) : 0;
		return saved ? Math.min(max, Math.max(min, saved)) : initial;
	});
	const ref = useRef(null);
	const dragging = useRef(false);

	useEffect(() => {
		const onMove = (e) => {
			if (!dragging.current || !ref.current) return;
			const left = ref.current.getBoundingClientRect().left;
			setWidth(Math.min(max, Math.max(min, e.clientX - left)));
		};
		const onUp = () => {
			if (!dragging.current) return;
			dragging.current = false;
			document.body.style.userSelect = "";
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, [min, max]);

	useEffect(() => {
		if (storageKey) localStorage.setItem(storageKey, String(width));
	}, [width, storageKey]);

	const startResize = useCallback((e) => {
		e.preventDefault();
		dragging.current = true;
		document.body.style.userSelect = "none";
	}, []);

	return { width, ref, startResize };
}
