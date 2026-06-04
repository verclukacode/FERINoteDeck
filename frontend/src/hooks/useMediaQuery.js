import { useEffect, useState } from "react";

// Subscribes to a CSS media-query and returns whether it currently matches.
// Used to switch React state on the same breakpoint Tailwind uses for layout
// (typically the `sm:` breakpoint at 640px).
export function useMediaQuery(query) {
	const [matches, setMatches] = useState(() => {
		if (typeof window === "undefined" || !window.matchMedia) return false;
		return window.matchMedia(query).matches;
	});

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mq = window.matchMedia(query);
		const handler = (e) => setMatches(e.matches);
		setMatches(mq.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [query]);

	return matches;
}
