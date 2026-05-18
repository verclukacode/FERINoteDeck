import { SQUIGGLE } from "./dividerShape.js";

// Static block rendering used by the drag overlay so a dragged block keeps a
// fixed size instead of stretching across blocks of different heights.
const TYPE_CLASS = {
	h1: "text-2xl font-bold",
	h2: "text-lg font-semibold",
};

export default function BlockPreview({ block, numberIndex }) {
	let body;
	if (block.type === "separator") {
		body = (
			<svg
				viewBox="0 0 2000 22"
				preserveAspectRatio="xMinYMid slice"
				className="h-5 w-full"
				aria-hidden="true"
			>
				<path
					d={SQUIGGLE}
					fill="none"
					stroke="#d7d7d7"
					strokeWidth="1.8"
					vectorEffect="non-scaling-stroke"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		);
	} else if (block.type === "image") {
		body = block.imageUrl ? (
			<img src={block.imageUrl} alt="" className="max-h-40 rounded-lg" />
		) : (
			<span className="text-body">Image</span>
		);
	} else {
		const marker =
			block.type === "bullet"
				? "•  "
				: block.type === "numbered"
					? `${numberIndex}.  `
					: block.type === "task"
						? "☐  "
						: "";
		body = (
			<span className={`text-title ${TYPE_CLASS[block.type] || ""}`}>
				{marker}
				{block.content || "Empty"}
			</span>
		);
	}

	return (
		<div className="truncate rounded-lg bg-bg px-3 py-1 shadow-[0_8px_16px_rgba(0,0,0,0.18)]">
			{body}
		</div>
	);
}
