import { useEffect, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Icon from "../../components/Icon.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";

const CARD_TYPES = [
	{ value: "rate", label: "Rate 1–4" },
	{ value: "boolean", label: "True / False" },
	{ value: "input", label: "Input" },
];

const typeLabel = (value) =>
	CARD_TYPES.find((t) => t.value === value)?.label ?? CARD_TYPES[0].label;

export default function CardDetails() {
	const { selectedCard, updateCard, removeCard } = useFlashcards();
	const [draft, setDraft] = useState({
		question: "",
		answer: "",
		type: "rate",
	});
	const [typeOpen, setTypeOpen] = useState(false);
	const [confirming, setConfirming] = useState(false);

	// Buffer edits locally so the store only updates when "Save" is pressed.
	// Resets whenever the selected card changes (switch card or after a save).
	useEffect(() => {
		setDraft({
			question: selectedCard?.question ?? "",
			answer: selectedCard?.answer ?? "",
			type: selectedCard?.type ?? "rate",
		});
		setTypeOpen(false);
	}, [selectedCard]);

	const dirty =
		!!selectedCard &&
		(draft.question !== selectedCard.question ||
			draft.answer !== selectedCard.answer ||
			draft.type !== selectedCard.type);

	const save = () => {
		if (!dirty) return;
		updateCard(selectedCard.id, {
			question: draft.question,
			answer: draft.answer,
			type: draft.type,
		});
	};

	return (
		<aside className="relative flex w-[420px] shrink-0 flex-col overflow-hidden rounded-[30px] border-[2.5px] border-folder-blue/40 bg-folder-blue/15">
			<div className="flex items-center gap-3 border-b-2 border-folder-blue/30 px-6 pb-5 pt-7">
				<h2 className="min-w-0 flex-1 truncate text-3xl font-bold text-title">
					Selected question
				</h2>
				{selectedCard && (
					<button
						type="button"
						disabled={!dirty}
						onClick={save}
						className={`flex h-[45px] shrink-0 items-center rounded-full border-[2.5px] px-5 text-[15px] font-semibold ${
							dirty
								? "border-folder-blue/15 bg-bg text-folder-blue"
								: "cursor-default border-folder-blue/20 bg-bg/50 text-body/40"
						}`}
					>
						{dirty ? "Save" : "Saved"}
					</button>
				)}
			</div>

			{selectedCard ? (
				<>
					<div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
						<div className="flex flex-col gap-2">
							<span className="text-sm font-semibold text-title">Question</span>
							<textarea
								value={draft.question}
								onChange={(e) =>
									setDraft((d) => ({ ...d, question: e.target.value }))
								}
								placeholder="Type the question…"
								className="h-[220px] w-full resize-none rounded-[22.5px] bg-bg p-5 text-[17px] text-title outline-none placeholder:text-body/50"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<span className="text-sm font-semibold text-title">Answer</span>
							<textarea
								value={draft.answer}
								onChange={(e) =>
									setDraft((d) => ({ ...d, answer: e.target.value }))
								}
								placeholder="Type the answer…"
								className="h-[220px] w-full resize-none rounded-[22.5px] bg-bg p-5 text-[17px] text-title outline-none placeholder:text-body/50"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<span className="text-sm font-semibold text-title">
								Card type
							</span>
							<div className="relative">
								<button
									type="button"
									onClick={() => setTypeOpen((o) => !o)}
									className="flex h-[45px] w-full items-center justify-center gap-2 rounded-[22.5px] border-[2.5px] border-black/15 bg-folder-purple font-semibold text-white"
								>
									{typeLabel(draft.type)}
									<Icon
										name="chevron"
										size={12}
										className="transition-transform"
										style={{
											transform: typeOpen ? "rotate(-90deg)" : "rotate(90deg)",
										}}
									/>
								</button>

								{typeOpen && (
									<>
										<button
											type="button"
											aria-label="Close menu"
											onClick={() => setTypeOpen(false)}
											className="fixed inset-0 z-10 cursor-default"
										/>
										<div className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-[18px] border-[2.5px] border-border-soft bg-bg p-1 shadow-[0_5px_0_rgba(0,0,0,0.12)]">
											{CARD_TYPES.map((t) => (
												<button
													key={t.value}
													type="button"
													onClick={() => {
														setDraft((d) => ({ ...d, type: t.value }));
														setTypeOpen(false);
													}}
													className={`flex w-full items-center justify-between rounded-[12px] px-4 py-2.5 text-left font-medium ${
														t.value === draft.type
															? "bg-folder-purple/10 text-folder-purple"
															: "text-title hover:bg-bg-secondary"
													}`}
												>
													{t.label}
													{t.value === draft.type && (
														<Icon name="checkmark" size={14} />
													)}
												</button>
											))}
										</div>
									</>
								)}
							</div>
						</div>
					</div>

					<div className="flex justify-end border-t-2 border-folder-blue/30 px-6 py-4">
						<button
							type="button"
							onClick={() => setConfirming(true)}
							aria-label="Delete card"
							className="flex h-[50px] w-[50px] items-center justify-center rounded-full border-[2.5px] border-black/15 bg-folder-red text-white"
						>
							<Icon name="trash" size={20} />
						</button>
					</div>
				</>
			) : (
				<div className="flex flex-1 items-center justify-center px-6 text-center text-body">
					Select a question to edit it.
				</div>
			)}

			{confirming && selectedCard && (
				<ConfirmDialog
					title="Delete card?"
					message="This question and its answer will be deleted."
					onConfirm={() => {
						removeCard(selectedCard.id);
						setConfirming(false);
					}}
					onCancel={() => setConfirming(false)}
				/>
			)}
		</aside>
	);
}
