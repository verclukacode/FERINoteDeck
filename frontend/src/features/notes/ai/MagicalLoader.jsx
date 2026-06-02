import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../../../components/Icon.jsx";

// File-kind icon for the floating pills.
function iconForFile(name) {
	const lower = name.toLowerCase();
	if (/\.(png|jpe?g|gif|webp)$/.test(lower)) return "image";
	if (/\.(pdf|docx|pptx)$/.test(lower)) return "document";
	if (/\.(txt|md)$/.test(lower)) return "text";
	return "document";
}

// Fake-but-believable staged progress while we wait for OpenAI.
const DEFAULT_STAGES = [
	{ until: 4000, target: 28, label: "Reading your files…" },
	{ until: 11000, target: 58, label: "Looking at the content…" },
	{ until: 22000, target: 82, label: "Composing your note…" },
	{ until: 40000, target: 94, label: "Almost there…" },
];

// Portalled to <body> at z-49 so it sits behind the modal (z-50). Mounting
// triggers the one-shot grow-in animation via the .ai-window-halo class.
export function ModalHalo() {
	return createPortal(
		<div className="ai-window-halo" aria-hidden="true" />,
		document.body,
	);
}

// The shared "AI is working" centre panel. The icon, title, and items are
// caller-supplied so the same loader can serve different generation flows
// (file import, deck generation, …).
export default function MagicalLoader({
	icon,
	title,
	items = [],
	stages = DEFAULT_STAGES,
}) {
	const [progress, setProgress] = useState(4);
	const [label, setLabel] = useState(stages[0].label);

	useEffect(() => {
		const start = Date.now();
		const tick = setInterval(() => {
			const elapsed = Date.now() - start;
			const stage =
				stages.find((s) => elapsed < s.until) ?? stages[stages.length - 1];
			setLabel(stage.label);
			setProgress((p) =>
				p < stage.target ? Math.min(p + 1, stage.target) : p,
			);
		}, 220);
		return () => clearInterval(tick);
	}, [stages]);

	return (
		<div className="relative flex min-h-[420px] flex-col items-center justify-center gap-6 overflow-hidden px-2 py-8">
			{icon}

			<h2 className="text-center text-2xl font-bold text-title">{title}</h2>

			{items.length > 0 && (
				<div className="flex max-w-[440px] flex-wrap items-center justify-center gap-2">
					{items.map((item, i) => (
						<span
							key={`${item.name}-${i}`}
							className="ai-pill-float flex max-w-[180px] items-center gap-1.5 rounded-full border-[2px] border-folder-purple/20 bg-folder-purple/10 px-3 py-1.5 text-xs font-semibold text-folder-purple shadow-[0_2px_0_rgba(112,146,255,0.15)]"
							style={{ animationDelay: `${(i % 6) * 0.3}s` }}
						>
							<Icon name={item.icon ?? iconForFile(item.name)} size={12} />
							<span className="truncate">{item.name}</span>
						</span>
					))}
				</div>
			)}

			<p className="text-sm font-medium text-body">{label}</p>

			<div className="w-full max-w-[360px]">
				<div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
					<div
						className="ai-progress-fill h-full rounded-full"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>
		</div>
	);
}
