import { createBlock } from "./blockModel.js";

// Page.content is wrapped in this sentinel to mark it as NoteDeck editor content.
const SENTINEL = "<<<NoteDeckMD>>>";

// A plain text line starting with one of these would be misread as another
// block type, so such text blocks are backslash-escaped on serialize.
const MARKER = /^(#{1,2} |- |\d+\. |---\s*$|!\[.*\]\(.*\)$|\\)/;

function escapeText(content) {
	return MARKER.test(content) ? `\\${content}` : content;
}

function unescapeText(line) {
	return line.startsWith("\\") ? line.slice(1) : line;
}

export function serialize(blocks) {
	let numberedRun = 0;
	const lines = blocks.map((b) => {
		if (b.type === "numbered") numberedRun += 1;
		else numberedRun = 0;
		const content = b.content || "";
		switch (b.type) {
			case "h1":
				return `# ${content}`;
			case "h2":
				return `## ${content}`;
			case "bullet":
				return `- ${content}`;
			case "numbered":
				return `${numberedRun}. ${content}`;
			case "task":
				return `- [${b.checked ? "x" : " "}] ${content}`;
			case "image":
				return `![${content}](${b.imageUrl || ""})`;
			case "separator":
				return "---";
			default:
				return escapeText(content);
		}
	});
	return `${SENTINEL}\n${lines.join("\n")}\n${SENTINEL}`;
}

function classify(line) {
	let m;
	if (line.startsWith("## ")) return createBlock("h2", line.slice(3));
	if (line.startsWith("# ")) return createBlock("h1", line.slice(2));
	if (/^---\s*$/.test(line)) return createBlock("separator");
	m = line.match(/^- \[([ xX])\] (.*)$/);
	if (m) {
		const block = createBlock("task", m[2]);
		block.checked = m[1].toLowerCase() === "x";
		return block;
	}
	if (line.startsWith("- ")) return createBlock("bullet", line.slice(2));
	m = line.match(/^\d+\.\s(.*)$/);
	if (m) return createBlock("numbered", m[1]);
	m = line.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
	if (m) {
		const block = createBlock("image", m[1]);
		block.imageUrl = m[2];
		return block;
	}
	return createBlock("text", unescapeText(line));
}

export function parse(content) {
	let body = content || "";
	if (body.startsWith(SENTINEL)) {
		body = body.slice(SENTINEL.length).replace(/^\n/, "");
	}
	if (body.endsWith(SENTINEL)) {
		body = body.slice(0, -SENTINEL.length).replace(/\n$/, "");
	}
	const blocks = body.split("\n").map(classify);
	return blocks.length > 0 ? blocks : [createBlock("text")];
}
