import { SQUIGGLE } from "../notes/editor/dividerShape.js";
import { contentToHtml } from "../notes/editor/inlineFormat.js";
import { parse as parseMarkdown } from "../notes/editor/markdown.js";

// Read-only renderer that mirrors EditorBlock's visual layout (the notes UI),
// without any of the contentEditable/drag/upload machinery. Used by the
// marketplace preview so a shared note looks like an actual note.
const TYPE_CLASS = {
	h1: "text-2xl font-bold text-title",
	h2: "text-lg font-semibold text-title",
	text: "text-title",
	bullet: "text-title",
	numbered: "text-title",
	task: "text-title",
};

// `contentToHtml` produces the same bold + URL markup the editor renders.
const InlineContent = ({ value }) => (
	// biome-ignore lint/security/noDangerouslySetInnerHtml: contentToHtml escapes user input and only adds bold + URL anchors (same renderer the editor uses)
	<span dangerouslySetInnerHTML={{ __html: contentToHtml(value ?? "") }} />
);

function Block({ block, numberIndex }) {
	if (block.type === "separator") {
		return (
			<div className="my-2">
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
			</div>
		);
	}

	if (block.type === "image") {
		// Defence-in-depth: even though the backend already rejects publishing
		// notes with non-local image URLs, drop anything that isn't a preset or
		// an upload of ours so a public marketplace listing can never silently
		// fetch from an attacker-controlled host (IP/UA tracking).
		const safe =
			typeof block.imageUrl === "string" &&
			(block.imageUrl.startsWith("/api/images/") ||
				block.imageUrl.startsWith("/avatars/"));
		if (!safe) return null;
		return (
			<div className="my-2">
				<img
					src={block.imageUrl}
					alt={block.caption || ""}
					className="max-h-[420px] rounded-[22.5px] border-[2.5px] border-border-soft"
				/>
				{block.caption && (
					<p className="mt-1 text-sm text-body">{block.caption}</p>
				)}
			</div>
		);
	}

	if (block.type === "bullet") {
		return (
			<div className="flex gap-2 py-0.5">
				<span className="select-none pt-1 text-body">•</span>
				<div className={`flex-1 ${TYPE_CLASS.bullet}`}>
					<InlineContent value={block.content} />
				</div>
			</div>
		);
	}

	if (block.type === "numbered") {
		return (
			<div className="flex gap-2 py-0.5">
				<span className="select-none pt-0.5 text-body">{numberIndex}.</span>
				<div className={`flex-1 ${TYPE_CLASS.numbered}`}>
					<InlineContent value={block.content} />
				</div>
			</div>
		);
	}

	if (block.type === "task") {
		return (
			<div className="flex gap-2 py-0.5">
				<input
					type="checkbox"
					checked={!!block.checked}
					readOnly
					className="mt-1 h-[18px] w-[18px] accent-folder-blue"
				/>
				<div
					className={`flex-1 ${TYPE_CLASS.task} ${
						block.checked ? "text-body line-through" : ""
					}`}
				>
					<InlineContent value={block.content} />
				</div>
			</div>
		);
	}

	// h1 / h2 / text
	return (
		<div className={`py-0.5 ${TYPE_CLASS[block.type] || "text-title"}`}>
			<InlineContent value={block.content} />
		</div>
	);
}

export default function NoteReadView({ content }) {
	let blocks = [];
	try {
		blocks = parseMarkdown(content ?? "");
	} catch {
		return (
			<pre className="whitespace-pre-wrap text-sm text-title">
				{content ?? ""}
			</pre>
		);
	}

	let numberIndex = 0;
	return (
		<div className="flex flex-col">
			{blocks.map((b, i) => {
				if (b.type === "numbered") numberIndex++;
				else numberIndex = 0;
				return (
					<Block key={`${b.type}-${i}`} block={b} numberIndex={numberIndex} />
				);
			})}
		</div>
	);
}
