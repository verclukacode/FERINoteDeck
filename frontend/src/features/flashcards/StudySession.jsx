import { useEffect, useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";

const norm = (s) => (s ?? "").trim().toLowerCase();

function Stats({ remaining, bad, revised }) {
	return (
		<div className="pt-7 text-center text-[17px] font-medium text-title">
			<span className="font-bold text-folder-blue">{remaining}</span> New
			<span className="text-body"> | </span>
			<span className="font-bold text-folder-orange">{bad}</span> Bad
			<span className="text-body"> | </span>
			<span className="font-bold text-folder-green">{revised}</span> Revised
		</div>
	);
}

function PromptCard({ children, height = "h-[480px]" }) {
	return (
		<div
			className={`flex w-[620px] max-w-[90vw] items-center rounded-[30px] border-2 border-border-soft bg-bg px-14 ${height}`}
		>
			<p className="whitespace-pre-wrap text-[22px] font-semibold leading-[1.4] text-title">
				{children}
			</p>
		</div>
	);
}

export default function StudySession({ cards, onClose }) {
	const [index, setIndex] = useState(0);
	const [phase, setPhase] = useState("front"); // front | reveal | result | finish
	const [bad, setBad] = useState(0);
	const [revised, setRevised] = useState(0);
	const [input, setInput] = useState("");
	const [result, setResult] = useState(null); // "correct" | "wrong"

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	const card = cards[index];
	const answered = bad + revised;
	const remaining = cards.length - answered;

	function advance() {
		setInput("");
		setResult(null);
		if (index + 1 >= cards.length) {
			setPhase("finish");
		} else {
			setIndex((i) => i + 1);
			setPhase("front");
		}
	}

	function grade(good) {
		if (good) setRevised((n) => n + 1);
		else setBad((n) => n + 1);
		advance();
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

			<Stats remaining={remaining} bad={bad} revised={revised} />

			{phase === "finish" ? (
				<>
					<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
						<Icon name="party" size={64} className="text-white" />
						<p className="text-6xl font-bold text-white">You are done!</p>
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
								<p className="whitespace-pre-wrap text-xl font-semibold">
									{card.answer || "—"}
								</p>
							</div>
						)}
					</div>
					<div className="flex justify-center px-4 pb-12">
						<DuoButton
							type="button"
							onClick={() => grade(result === "correct")}
							className="h-[52px] w-[388px] max-w-[90vw] bg-bg text-title shadow-[0_2.5px_0_rgba(0,0,0,0.12)]"
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
									onClick={() => grade(false)}
									className="h-[50px] w-[200px] max-w-[40vw] bg-folder-red text-white shadow-[0_2.5px_0_#d95a5a]"
								>
									Wrong
								</DuoButton>
								<DuoButton
									type="button"
									onClick={() => grade(true)}
									className="h-[50px] w-[200px] max-w-[40vw] bg-folder-green text-white shadow-[0_2.5px_0_#25b89a]"
								>
									Correct
								</DuoButton>
							</>
						) : (
							<>
								<DuoButton
									type="button"
									onClick={() => grade(false)}
									className="h-[50px] min-w-[120px] bg-folder-red text-white shadow-[0_2.5px_0_#d95a5a]"
								>
									Bad
								</DuoButton>
								<DuoButton
									type="button"
									onClick={() => grade(false)}
									className="h-[50px] min-w-[120px] bg-folder-orange text-white shadow-[0_2.5px_0_#d9824f]"
								>
									Meh
								</DuoButton>
								<DuoButton
									type="button"
									onClick={() => grade(true)}
									className="h-[50px] min-w-[120px] bg-folder-green text-white shadow-[0_2.5px_0_#25b89a]"
								>
									Good
								</DuoButton>
								<DuoButton
									type="button"
									onClick={() => grade(true)}
									className="h-[50px] min-w-[120px] bg-folder-blue text-white shadow-[0_2.5px_0_#3e86cf]"
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
		</div>
	);
}
