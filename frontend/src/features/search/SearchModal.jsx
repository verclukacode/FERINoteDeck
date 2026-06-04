import { useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { VIEW } from "../../lib/constants.js";
import { search } from "../../services/searchService.js";
import { useFlashcards } from "../flashcards/FlashcardsContext.jsx";
import { useNotes } from "../notes/NotesContext.jsx";

function useDebounced(value, ms = 200) {
	const [v, setV] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setV(value), ms);
		return () => clearTimeout(t);
	}, [value, ms]);
	return v;
}

const KIND_LABEL = { note: "Note", deck: "Deck", card: "Card" };

// Spotlight-style modal: type a query, hit results from any feature, click to
// switch view + expand parent folder + select the target.
export default function SearchModal({ onClose }) {
	const { setView, selectPage, editFolder: editNoteFolder } = useNotes();
	const {
		editFolder: editFlashcardFolder,
		selectDeck,
		selectCard,
	} = useFlashcards();

	const [q, setQ] = useState("");
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const inputRef = useRef(null);

	const debouncedQ = useDebounced(q, 200);

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		const term = debouncedQ.trim();
		if (!term) {
			setItems([]);
			setError("");
			return;
		}
		let active = true;
		setLoading(true);
		setError("");
		search(term)
			.then((data) => {
				if (!active) return;
				setItems(data?.items ?? []);
			})
			.catch((e) => {
				if (!active) return;
				setError(e?.message ?? "Search failed");
				setItems([]);
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [debouncedQ]);

	function pick(item) {
		if (item.kind === "note") {
			setView(VIEW.NOTES);
			if (item.folderId) editNoteFolder(item.folderId, { collapsed: false });
			selectPage(item.id);
		} else if (item.kind === "deck") {
			setView(VIEW.FLASHCARDS);
			if (item.folderId)
				editFlashcardFolder(item.folderId, { collapsed: false });
			selectDeck(item.id);
		} else {
			// card
			setView(VIEW.FLASHCARDS);
			if (item.folderId)
				editFlashcardFolder(item.folderId, { collapsed: false });
			if (item.deckId) selectDeck(item.deckId);
			selectCard(item.id);
		}
		onClose();
	}

	const term = q.trim();

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-4 sm:px-0 sm:pt-[10vh]">
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 bg-black/15"
			/>
			<div className="relative flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-[30px] border-[2.5px] border-border-soft bg-bg shadow-[0_5px_0_rgba(0,0,0,0.12)] sm:max-h-[70vh] sm:w-[640px] sm:max-w-[90vw]">
				<div className="flex items-center gap-3 border-b-[2.5px] border-border-soft px-6 py-4">
					<Icon name="search" size={18} className="text-body" />
					<input
						ref={inputRef}
						type="text"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search notes, decks, cards…"
						className="flex-1 bg-transparent text-lg text-title outline-none placeholder:text-body/60"
					/>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-body hover:bg-border-soft"
					>
						<Icon name="xmark" size={14} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto px-2 py-2">
					{error && (
						<p className="p-6 text-center text-sm text-folder-red">{error}</p>
					)}
					{!error && !term && (
						<p className="p-6 text-center text-sm text-body">
							Start typing to search your notes and flashcards.
						</p>
					)}
					{!error && term && !loading && items.length === 0 && (
						<p className="p-6 text-center text-sm text-body">No results.</p>
					)}
					{!error && loading && items.length === 0 && (
						<p className="p-6 text-center text-sm text-body">Searching…</p>
					)}
					{items.map((item) => (
						<button
							key={`${item.kind}:${item.id}`}
							type="button"
							onClick={() => pick(item)}
							className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left hover:bg-bg-secondary"
						>
							<Icon
								name={item.kind === "note" ? "document" : "flashcards"}
								size={18}
								className="mt-0.5 shrink-0 text-body"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate font-semibold text-title">
									{item.title || "(untitled)"}
								</p>
								{item.subtitle && (
									<p className="truncate text-sm text-body">{item.subtitle}</p>
								)}
							</div>
							<span className="ml-2 shrink-0 rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-medium text-body">
								{KIND_LABEL[item.kind]}
							</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
