import { useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import {
	bulkCreateCards,
	createDeck,
} from "../../services/flashcardsService.js";
import { useFlashcards } from "./FlashcardsContext.jsx";

const CARD_TYPES = [
	{ value: "rate", label: "Rate (1–4)" },
	{ value: "boolean", label: "True / False" },
];

// Post-parse modal: lets the user edit each card, pick a destination
// (new deck with a name, or an existing deck in this folder), and commit.
export default function ImportCsvDialog({
	folderId,
	defaultDeckName,
	initialCards,
	onClose,
}) {
	const { decks, addDeckFromClone, importCardsIntoDeck } = useFlashcards();
	const folderDecks = decks.filter(
		(d) => d.folderId === folderId && !d.sharedFromDeckId,
	);

	// Each row carries a stable client-side _uid so React keys don't reuse
	// across edits (otherwise inputs lose focus on every keystroke).
	const [cards, setCards] = useState(() =>
		initialCards.map((c) => ({ ...c, _uid: crypto.randomUUID() })),
	);
	// Destination: "new" → create a deck; or a deckId string → existing deck.
	const [destination, setDestination] = useState(
		folderDecks.length > 0 ? folderDecks[0].id : "new",
	);
	const [deckName, setDeckName] = useState(defaultDeckName || "Imported deck");
	const [mode, setMode] = useState(folderDecks.length > 0 ? "existing" : "new");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	function updateCard(idx, patch) {
		setCards((prev) =>
			prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
		);
	}
	function removeCard(idx) {
		setCards((prev) => prev.filter((_, i) => i !== idx));
	}
	function addBlankCard() {
		setCards((prev) => [
			...prev,
			{
				_uid: crypto.randomUUID(),
				question: "",
				answer: "",
				type: "rate",
			},
		]);
	}

	async function handleSave() {
		const cleaned = cards
			.map((c) => ({
				question: (c.question ?? "").trim(),
				answer: (c.answer ?? "").trim(),
				type: c.type === "boolean" ? "boolean" : "rate",
			}))
			.filter((c) => c.question && c.answer);
		if (!cleaned.length) {
			setError("Add at least one card with a question and answer.");
			return;
		}
		setError("");
		setSaving(true);
		try {
			if (mode === "new") {
				const result = await createDeck({
					folderId,
					name: deckName.trim() || "Imported deck",
					cards: cleaned,
				});
				addDeckFromClone({ deck: result.deck, cards: result.cards ?? [] });
			} else {
				await importCardsIntoDeck(destination, cleaned);
			}
			onClose();
		} catch (err) {
			setError(err.message ?? "Import failed");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			open
			onClose={saving ? () => {} : onClose}
			className="w-[640px] max-h-[85vh] overflow-y-auto"
		>
			<h2 className="px-1 text-2xl font-bold text-title">Import flashcards</h2>
			<p className="mt-1 px-1 text-sm text-body">
				{cards.length} card{cards.length === 1 ? "" : "s"} parsed from the CSV.
				Tidy them up below, then pick where they should land.
			</p>

			{/* Cards — editable list */}
			<div className="mt-4 flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
				{cards.map((c, i) => (
					<div
						key={c._uid}
						className="flex flex-col gap-2 rounded-2xl border-[2.5px] border-border-soft p-3"
					>
						<div className="flex items-start gap-2">
							<span className="mt-2 w-5 shrink-0 text-center text-xs font-bold text-body">
								{i + 1}
							</span>
							<div className="flex-1">
								<textarea
									value={c.question}
									onChange={(e) => updateCard(i, { question: e.target.value })}
									placeholder="Question"
									rows={1}
									className="w-full resize-none rounded-xl bg-bg-secondary px-3 py-2 text-sm text-title outline-none placeholder:text-body/50"
								/>
								<textarea
									value={c.answer}
									onChange={(e) => updateCard(i, { answer: e.target.value })}
									placeholder="Answer"
									rows={1}
									className="mt-2 w-full resize-none rounded-xl bg-bg-secondary px-3 py-2 text-sm text-title outline-none placeholder:text-body/50"
								/>
							</div>
							<button
								type="button"
								onClick={() => removeCard(i)}
								aria-label="Remove card"
								className="shrink-0 px-1 pt-2 text-body"
							>
								×
							</button>
						</div>
						<div className="flex items-center gap-2 pl-7">
							<label
								className="text-xs font-semibold text-body"
								htmlFor={`type-${i}`}
							>
								Type
							</label>
							<div className="relative inline-flex">
								<select
									id={`type-${i}`}
									value={c.type}
									onChange={(e) => updateCard(i, { type: e.target.value })}
									className="cursor-pointer appearance-none rounded-2xl border-[2.5px] border-border-soft bg-bg-secondary px-3 py-1.5 pr-8 text-xs font-medium text-title outline-none"
								>
									{CARD_TYPES.map((t) => (
										<option key={t.value} value={t.value}>
											{t.label}
										</option>
									))}
								</select>
								<span
									className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-body"
									aria-hidden="true"
								>
									<Icon
										name="chevron"
										size={10}
										style={{ transform: "rotate(90deg)" }}
									/>
								</span>
							</div>
						</div>
					</div>
				))}
				<button
					type="button"
					onClick={addBlankCard}
					className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-body/40 px-4 py-3 text-sm font-semibold text-folder-purple hover:bg-bg-secondary"
				>
					<Icon name="plus" size={16} />
					Add card
				</button>
			</div>

			{/* Destination */}
			<div className="mt-5 flex flex-col gap-2">
				<p className="px-1 text-sm font-semibold text-title">
					Where to put them
				</p>

				<label
					className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[2.5px] px-4 py-3 ${
						mode === "new"
							? "border-folder-purple bg-folder-purple/15"
							: "border-border-soft"
					}`}
				>
					<input
						type="radio"
						name="csv-dest"
						checked={mode === "new"}
						onChange={() => setMode("new")}
						className="sr-only"
					/>
					<span
						aria-hidden="true"
						className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2.5px] transition-colors ${
							mode === "new" ? "border-folder-purple" : "border-border-soft"
						}`}
					>
						{mode === "new" && (
							<span className="h-2.5 w-2.5 rounded-full bg-folder-purple" />
						)}
					</span>
					<span className="font-medium text-title">New deck</span>
					{mode === "new" && (
						<input
							type="text"
							value={deckName}
							onChange={(e) => setDeckName(e.target.value)}
							placeholder="Deck title"
							maxLength={200}
							className="ml-auto w-1/2 rounded-xl bg-bg-secondary px-3 py-2 text-sm text-title outline-none"
						/>
					)}
				</label>

				{folderDecks.length > 0 && (
					<label
						className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[2.5px] px-4 py-3 ${
							mode === "existing"
								? "border-folder-purple bg-folder-purple/15"
								: "border-border-soft"
						}`}
					>
						<input
							type="radio"
							name="csv-dest"
							checked={mode === "existing"}
							onChange={() => setMode("existing")}
							className="sr-only"
						/>
						<span
							aria-hidden="true"
							className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2.5px] transition-colors ${
								mode === "existing"
									? "border-folder-purple"
									: "border-border-soft"
							}`}
						>
							{mode === "existing" && (
								<span className="h-2.5 w-2.5 rounded-full bg-folder-purple" />
							)}
						</span>
						<span className="font-medium text-title">Existing deck</span>
						{mode === "existing" && (
							<div className="relative ml-auto w-1/2">
								<select
									value={destination}
									onChange={(e) => setDestination(e.target.value)}
									className="w-full cursor-pointer appearance-none rounded-2xl border-[2.5px] border-border-soft bg-bg-secondary px-4 py-2.5 pr-10 text-sm font-medium text-title outline-none"
								>
									{folderDecks.map((d) => (
										<option key={d.id} value={d.id}>
											{d.name}
										</option>
									))}
								</select>
								<span
									className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body"
									aria-hidden="true"
								>
									<Icon
										name="chevron"
										size={12}
										style={{ transform: "rotate(90deg)" }}
									/>
								</span>
							</div>
						)}
					</label>
				)}
			</div>

			{error && (
				<p className="mt-3 text-center text-sm text-folder-red">{error}</p>
			)}

			<DuoButton
				type="button"
				onClick={handleSave}
				disabled={saving || cards.length === 0}
				className="mt-5 h-[45px] w-full bg-folder-purple text-white shadow-[0_2.5px_0_#5b78dd] disabled:opacity-60"
			>
				{saving
					? "Saving…"
					: `Save ${cards.length} card${cards.length === 1 ? "" : "s"}`}
			</DuoButton>
			<button
				type="button"
				onClick={onClose}
				disabled={saving}
				className="mt-2 w-full py-1 font-medium text-title disabled:opacity-60"
			>
				Cancel
			</button>
		</Modal>
	);
}
