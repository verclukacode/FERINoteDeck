import { useEffect, useRef, useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import { answerCard, getDeckQueue } from "../../services/flashcardsService.js";
import { contentToHtml } from "../notes/editor/inlineFormat.js";
import { useFlashcards } from "./FlashcardsContext.jsx";

const norm = (s) => (s ?? "").trim().toLowerCase();

// Grades: 1=Again 2=Hard 3=Good 4=Easy.
const GRADE = { again: 1, hard: 2, good: 3, easy: 4 };

// A learning/relearning card whose next step is sooner than this is re-shown
// later in the same session (Anki re-queues short steps); longer ones are done.
const REQUEUE_THRESHOLD_MS = 20 * 60 * 1000;
const REQUEUE_GAP = 3;

function Stats({ counts }) {
	return (
		<div className="pt-7 text-center text-[17px] font-medium text-title">
			<span className="font-bold text-folder-blue">{counts.new}</span> New
			<span className="text-body"> | </span>
			<span className="font-bold text-folder-orange">{counts.learning}</span>{" "}
			Learning
			<span className="text-body"> | </span>
			<span className="font-bold text-folder-green">{counts.review}</span>{" "}
			Review
		</div>
	);
}

function PromptCard({ children, height = "h-[480px]" }) {
	return (
		<div
			className={`flex w-[620px] max-w-[90vw] items-center justify-center overflow-hidden rounded-[30px] border-2 border-border-soft bg-bg px-10 py-8 ${height}`}
		>
			<div className="max-h-full w-full overflow-y-auto overflow-x-hidden">
				<p
					className="whitespace-pre-wrap break-words text-center text-[22px] font-semibold leading-[1.4] text-title"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: contentToHtml escapes user input and only renders bold, URL autolinks, and KaTeX math
					dangerouslySetInnerHTML={{ __html: contentToHtml(children || "—") }}
				/>
			</div>
		</div>
	);
}

function liveCounts(queue) {
	let nw = 0;
	let learning = 0;
	let review = 0;
	for (const c of queue) {
		if (c.state === "new") nw++;
		else if (c.state === "learning" || c.state === "relearning") learning++;
		else review++;
	}
	return { new: nw, learning, review };
}

export default function StudySession({ deckId, onClose }) {
	const { mergeCards } = useFlashcards();
	const [queue, setQueue] = useState([]);
	const [phase, setPhase] = useState("loading"); // loading | front | reveal | result | finish | error
	const [input, setInput] = useState("");
	const [result, setResult] = useState(""); // "" | "correct" | "wrong"
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const frontShownAt = useRef(Date.now());

	// Load the due queue for this deck.
	useEffect(() => {
		let active = true;
		getDeckQueue(deckId)
			.then((data) => {
				if (!active) return;
				const cards = data?.cards ?? [];
				setQueue(cards);
				frontShownAt.current = Date.now();
				setPhase(cards.length ? "front" : "finish");
			})
			.catch((e) => {
				if (!active) return;
				setError(e?.message ?? "Failed to load study queue");
				setPhase("error");
			});
		return () => {
			active = false;
		};
	}, [deckId]);

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	const card = queue[0];
	const counts = liveCounts(queue);

	async function answer(grade) {
		if (!card || submitting) return;
		setSubmitting(true);
		setError("");
		try {
			const updated = await answerCard(
				card.id,
				grade,
				Date.now() - frontShownAt.current,
			);
			mergeCards([updated]);
			const shortStep =
				(updated.state === "learning" || updated.state === "relearning") &&
				updated.due != null &&
				updated.due - Date.now() < REQUEUE_THRESHOLD_MS;

			let next = queue.slice(1);
			if (shortStep) {
				const pos = Math.min(REQUEUE_GAP, next.length);
				next = [...next.slice(0, pos), updated, ...next.slice(pos)];
			}
			setQueue(next);
			setInput("");
			setResult("");
			frontShownAt.current = Date.now();
			setPhase(next.length ? "front" : "finish");
		} catch (e) {
			setError(e?.message ?? "Failed to save answer");
		} finally {
			setSubmitting(false);
		}
	}

	function submitInput() {
		const correct = norm(input) !== "" && norm(input) === norm(card.answer);
		setResult(correct ? "correct" : "wrong");
		setPhase("result");
	}

	const bg =
		phase === "finish"
			? "bg-accent-yellow"
			: phase === "result"
				? result === "correct"
					? "bg-folder-green"
					: "bg-folder-red"
				: "bg-bg-secondary";

	const onColor = phase === "result" || phase === "finish";

	return (
		<div className={`fixed inset-0 z-50 flex flex-col ${bg}`}>
			<button
				type="button"
				onClick={onClose}
				aria-label="Exit study"
				className={`absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full ${
					onColor
						? "text-white/80 hover:text-white"
						: "text-body hover:text-title"
				}`}
			>
				<Icon name="xmark" size={16} />
			</button>

			{phase !== "loading" && phase !== "error" && phase !== "finish" && (
				<Stats counts={counts} />
			)}

			{phase === "loading" ? (
				<div className="flex flex-1 items-center justify-center text-body">
					Loading…
				</div>
			) : phase === "error" ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-body">
					<p>{error}</p>
					<DuoButton
						type="button"
						onClick={onClose}
						className="h-[52px] w-[388px] max-w-[90vw] bg-bg text-title shadow-[0_2.5px_0_rgba(0,0,0,0.12)]"
					>
						Close
					</DuoButton>
				</div>
			) : phase === "finish" ? (
				<>
					<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
						<Icon name="party" size={64} className="text-white" />
						<p className="text-4xl font-bold text-white sm:text-6xl">
							You are done!
						</p>
					</div>
					<div className="flex justify-center px-4 pb-12">
						<DuoButton
							type="button"
							onClick={onClose}
							className="h-[52px] w-[388px] max-w-[90vw] bg-bg text-title shadow-[0_2.5px_0_rgba(0,0,0,0.12)]"
						>
							Done
						</DuoButton>
					</div>
				</>
			) : phase === "result" ? (
				<>
					<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
						<Icon
							name={result === "correct" ? "checkmark" : "xmark"}
							size={72}
							className="text-white"
						/>
						<p className="text-6xl font-bold text-white">
							{result === "correct" ? "Correct" : "False"}
						</p>
						{result === "wrong" && (
							<div className="flex max-w-[620px] flex-col items-center gap-1 text-center text-white">
								<span className="text-sm font-semibold uppercase tracking-wide text-white/70">
									Correct answer
								</span>
								<p
									className="whitespace-pre-wrap break-words text-xl font-semibold"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: contentToHtml escapes user input and only renders bold, URL autolinks, and KaTeX math
									dangerouslySetInnerHTML={{
										__html: contentToHtml(card.answer || "—"),
									}}
								/>
							</div>
						)}
					</div>
					<div className="flex justify-center px-4 pb-12">
						<DuoButton
							type="button"
							disabled={submitting}
							onClick={() =>
								answer(result === "correct" ? GRADE.good : GRADE.again)
							}
							className="h-[52px] w-[388px] max-w-[90vw] bg-bg text-title shadow-[0_2.5px_0_rgba(0,0,0,0.12)] disabled:opacity-60"
						>
							Next
						</DuoButton>
					</div>
				</>
			) : phase === "reveal" ? (
				<>
					<div className="flex flex-1 flex-col items-center justify-center px-4">
						<PromptCard>{card.answer || "—"}</PromptCard>
					</div>
					<div className="flex flex-wrap justify-center gap-2.5 px-4 pb-12">
						{card.type === "boolean" ? (
							<>
								<DuoButton
									type="button"
									disabled={submitting}
									onClick={() => answer(GRADE.again)}
									className="h-[50px] w-[200px] max-w-[40vw] bg-folder-red text-white shadow-[0_2.5px_0_#d95a5a] disabled:opacity-60"
								>
									Wrong
								</DuoButton>
								<DuoButton
									type="button"
									disabled={submitting}
									onClick={() => answer(GRADE.good)}
									className="h-[50px] w-[200px] max-w-[40vw] bg-folder-green text-white shadow-[0_2.5px_0_#25b89a] disabled:opacity-60"
								>
									Correct
								</DuoButton>
							</>
						) : (
							<>
								<DuoButton
									type="button"
									disabled={submitting}
									onClick={() => answer(GRADE.again)}
									className="h-[50px] min-w-[120px] bg-folder-red text-white shadow-[0_2.5px_0_#d95a5a] disabled:opacity-60"
								>
									Bad
								</DuoButton>
								<DuoButton
									type="button"
									disabled={submitting}
									onClick={() => answer(GRADE.hard)}
									className="h-[50px] min-w-[120px] bg-folder-orange text-white shadow-[0_2.5px_0_#d9824f] disabled:opacity-60"
								>
									Meh
								</DuoButton>
								<DuoButton
									type="button"
									disabled={submitting}
									onClick={() => answer(GRADE.good)}
									className="h-[50px] min-w-[120px] bg-folder-green text-white shadow-[0_2.5px_0_#25b89a] disabled:opacity-60"
								>
									Good
								</DuoButton>
								<DuoButton
									type="button"
									disabled={submitting}
									onClick={() => answer(GRADE.easy)}
									className="h-[50px] min-w-[120px] bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf] disabled:opacity-60"
								>
									Amazing
								</DuoButton>
							</>
						)}
					</div>
				</>
			) : card.type === "input" ? (
				<>
					<div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
						<PromptCard height="h-[320px]">{card.question || "—"}</PromptCard>
						<div className="flex w-[620px] max-w-[90vw] flex-col gap-2">
							<span className="text-sm font-semibold text-title">
								Your answer
							</span>
							<textarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="It needs to be like you set it in cards"
								className="h-[120px] w-full resize-none rounded-[22.5px] border-2 border-border-soft bg-bg p-5 text-[17px] text-title outline-none placeholder:text-body/50"
							/>
						</div>
					</div>
					<div className="flex justify-center px-4 pb-12">
						<DuoButton
							type="button"
							onClick={submitInput}
							className="h-[52px] w-[388px] max-w-[90vw] bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf]"
						>
							Submit answer
						</DuoButton>
					</div>
				</>
			) : (
				<>
					<div className="flex flex-1 flex-col items-center justify-center px-4">
						<PromptCard>{card.question || "—"}</PromptCard>
					</div>
					<div className="flex justify-center px-4 pb-12">
						<DuoButton
							type="button"
							onClick={() => setPhase("reveal")}
							className="h-[52px] w-[388px] max-w-[90vw] bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf]"
						>
							Show Answer
						</DuoButton>
					</div>
				</>
			)}

			{error && phase !== "error" && (
				<p className="pb-4 text-center text-sm text-folder-red">{error}</p>
			)}
		</div>
	);
}
