import { useCallback, useEffect, useState } from "react";

export function useContextMenu() {
	const [menu, setMenu] = useState(null);

	const open = useCallback((event) => {
		event.preventDefault();
		event.stopPropagation();
		setMenu({ x: event.clientX, y: event.clientY });
	}, []);

	const close = useCallback(() => setMenu(null), []);

	useEffect(() => {
		if (!menu) return;
		const onKey = (e) => e.key === "Escape" && close();
		window.addEventListener("click", close);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("click", close);
			window.removeEventListener("keydown", onKey);
		};
	}, [menu, close]);

	return { menu, open, close };
}
