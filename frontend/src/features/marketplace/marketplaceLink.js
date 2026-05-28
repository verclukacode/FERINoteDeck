// Shareable deep-link helpers for marketplace items.
// URL shape: `${origin}/?market=<kind>:<id>` (kind ∈ {"note","deck"}).
// NotesPage parses this on mount to pre-open the marketplace at that item.

export const MARKET_PARAM = "market";

export function buildMarketplaceLink({ kind, id }) {
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	return `${origin}/?${MARKET_PARAM}=${kind}:${id}`;
}

// Parse either a full URL or a raw "kind:id" / "?market=kind:id" fragment.
// Returns { kind, id } if a valid marketplace reference is found, else null.
export function parseMarketplaceLink(input) {
	if (!input) return null;
	const text = String(input).trim();
	if (!text) return null;

	// Try as a URL first so we can read its query string.
	let raw = null;
	try {
		const u = new URL(text);
		raw = u.searchParams.get(MARKET_PARAM);
	} catch {
		// Not an absolute URL — fall through to substring checks.
	}
	if (!raw) {
		const m = text.match(/[?&]market=([^&#\s]+)/);
		if (m) raw = decodeURIComponent(m[1]);
	}
	if (!raw && /^(note|deck):[\w-]+$/.test(text)) raw = text;
	if (!raw) return null;

	const m = raw.match(/^(note|deck):([\w-]+)$/);
	if (!m) return null;
	return { kind: m[1], id: m[2] };
}
