import { useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { listMarketplace } from "../../services/marketplaceService.js";
import CloneFolderPickerDialog from "./CloneFolderPickerDialog.jsx";
import MarketplaceCard from "./MarketplaceCard.jsx";
import MarketplacePreview from "./MarketplacePreview.jsx";
import { parseMarketplaceLink } from "./marketplaceLink.js";

const PAGE_LIMIT = 20;
const TABS = [
	{ value: "all", label: "All" },
	{ value: "note", label: "Notes" },
	{ value: "deck", label: "Flashcards" },
];

// Debounce a value so search queries don't fire on every keystroke.
function useDebounced(value, ms = 300) {
	const [v, setV] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setV(value), ms);
		return () => clearTimeout(t);
	}, [value, ms]);
	return v;
}

export default function MarketplaceModal({ onClose, initialSelected = null }) {
	const [query, setQuery] = useState("");
	const [kind, setKind] = useState("all");
	const [items, setItems] = useState([]);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState(initialSelected);
	const [picker, setPicker] = useState(null); // same shape, set on Clone click

	// If the search box is filled with a marketplace link, jump straight to it
	// instead of running a (useless) keyword search.
	function handleSearchChange(value) {
		const link = parseMarketplaceLink(value);
		if (link) {
			setSelected({ kind: link.kind, id: link.id, title: "" });
			setQuery("");
			return;
		}
		setQuery(value);
	}

	const debouncedQuery = useDebounced(query, 300);

	// Close on Escape (and let the modal close picker first if it's open).
	useEffect(() => {
		const onKey = (e) => {
			if (e.key !== "Escape") return;
			if (picker) setPicker(null);
			else onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, picker]);

	// Fetch first page on (query, kind) change. On the very first run we keep
	// any deep-link `initialSelected` (e.g. from `?market=note:abc`); after that,
	// user-driven search/kind changes clear the preview.
	const firstFetchRef = useRef(true);
	useEffect(() => {
		let active = true;
		setLoading(true);
		setError("");
		listMarketplace({ q: debouncedQuery, kind, offset: 0, limit: PAGE_LIMIT })
			.then((data) => {
				if (!active) return;
				setItems(data?.items ?? []);
				setHasMore(!!data?.hasMore);
				setOffset(PAGE_LIMIT);
				if (firstFetchRef.current) {
					firstFetchRef.current = false;
				} else {
					setSelected(null);
				}
			})
			.catch((e) => {
				if (!active) return;
				setError(e?.message ?? "Failed to load");
				setItems([]);
				setHasMore(false);
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [debouncedQuery, kind]);

	async function loadMore() {
		if (loading || !hasMore) return;
		setLoading(true);
		try {
			const data = await listMarketplace({
				q: debouncedQuery,
				kind,
				offset,
				limit: PAGE_LIMIT,
			});
			setItems((prev) => [...prev, ...(data?.items ?? [])]);
			setHasMore(!!data?.hasMore);
			setOffset((o) => o + PAGE_LIMIT);
		} catch (e) {
			setError(e?.message ?? "Failed to load");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 bg-black/15"
			/>
			<div className="relative flex h-[calc(100dvh-1.5rem)] w-full max-w-[1000px] flex-col rounded-[30px] border-[2.5px] border-border-soft bg-bg shadow-[0_5px_0_rgba(0,0,0,0.12)] sm:h-[80vh]">
				{/* Header */}
				<div className="flex items-center gap-3 border-b-[2.5px] border-border-soft px-4 py-4 sm:px-6 sm:py-5">
					<Icon name="store" size={22} className="text-folder-blue" />
					<h2 className="flex-1 text-2xl font-bold text-title">Marketplace</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-body hover:bg-border-soft"
					>
						<Icon name="xmark" size={14} />
					</button>
				</div>

				{/* Toolbar */}
				<div className="flex items-center gap-2 border-b-[2.5px] border-border-soft px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
					<div className="relative flex-1">
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-body">
							<Icon name="search" size={16} />
						</span>
						<input
							type="text"
							value={query}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder="Search title, description, @username, or paste a link…"
							className="w-full rounded-full bg-bg-secondary py-2.5 pl-9 pr-4 text-sm text-title placeholder:text-body/60 outline-none"
						/>
					</div>
					<div className="flex h-[45px] items-center gap-1 rounded-full bg-bg p-1">
						{TABS.map((t) => {
							const active = kind === t.value;
							return (
								<button
									key={t.value}
									type="button"
									onClick={() => setKind(t.value)}
									className={`flex h-full items-center rounded-full px-5 font-semibold outline-none transition-colors ${
										active ? "bg-bg-secondary text-title" : "text-body"
									}`}
								>
									{t.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Body: list (left) + preview (right). On mobile only one is
				    visible at a time — picking an item flips to the preview. */}
				<div className="flex flex-1 overflow-hidden">
					<div
						className={`${selected ? "hidden" : "flex"} w-full flex-col gap-2 overflow-y-auto border-r-[2.5px] border-border-soft px-4 py-4 sm:flex sm:w-[40%] sm:min-w-[320px]`}
					>
						{error && (
							<p className="text-center text-sm text-folder-red">{error}</p>
						)}
						{!loading && !error && items.length === 0 && (
							<p className="py-12 text-center text-sm text-body">
								Nothing here yet. Be the first to share something!
							</p>
						)}
						{items.map((item) => {
							const isSelected =
								selected?.kind === item.kind && selected?.id === item.id;
							return (
								<MarketplaceCard
									key={`${item.kind}:${item.id}`}
									item={item}
									selected={isSelected}
									onClick={() =>
										setSelected({
											kind: item.kind,
											id: item.id,
											title: item.title,
										})
									}
								/>
							);
						})}
						{hasMore && (
							<button
								type="button"
								onClick={loadMore}
								disabled={loading}
								className="mt-2 min-h-[40px] w-full rounded-full border-[2.5px] border-dashed border-body/40 text-sm font-semibold text-title disabled:opacity-60"
							>
								{loading ? "Loading…" : "Load more"}
							</button>
						)}
						{loading && items.length === 0 && (
							<p className="py-12 text-center text-sm text-body">Loading…</p>
						)}
					</div>

					<div
						className={`${selected ? "flex" : "hidden"} min-w-0 flex-1 flex-col sm:flex`}
					>
						{selected ? (
							<MarketplacePreview
								key={`${selected.kind}:${selected.id}`}
								kind={selected.kind}
								id={selected.id}
								onClone={() => setPicker(selected)}
								onBack={() => setSelected(null)}
							/>
						) : (
							<div className="flex flex-1 items-center justify-center text-center text-sm text-body">
								Select an item to preview.
							</div>
						)}
					</div>
				</div>

				{picker && (
					<CloneFolderPickerDialog
						kind={picker.kind}
						sourceId={picker.id}
						sourceTitle={picker.title}
						onClose={() => setPicker(null)}
						onCloned={() => {
							// keep the marketplace open so users can clone more
						}}
					/>
				)}
			</div>
		</div>
	);
}
