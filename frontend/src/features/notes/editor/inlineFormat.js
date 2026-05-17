// Inline formatting helpers for text-bearing blocks. Block content is stored
// as markdown (`**bold**`); URLs are auto-detected, never stored as markup.

export const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+/g;

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

// markdown content -> innerHTML for a contentEditable block.
export function contentToHtml(content) {
	let html = escapeHtml(content || "");
	html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
	html = html.replace(URL_REGEX, (url) => {
		const href = url.startsWith("http") ? url : `https://${url}`;
		return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
	});
	return html;
}

// contentEditable DOM -> markdown content.
export function htmlToContent(el) {
	let result = "";
	for (const node of el.childNodes) {
		const name = node.nodeName;
		if (name === "B" || name === "STRONG") {
			const inner = node.textContent;
			result += inner ? `**${inner}**` : "";
		} else {
			result += node.textContent;
		}
	}
	return result;
}

// Plain-text caret offset from the start of `el`.
export function getCursorOffset(el, range) {
	const pre = document.createRange();
	pre.selectNodeContents(el);
	pre.setEnd(range.startContainer, range.startOffset);
	return pre.toString().length;
}

// Place the caret at a plain-text offset inside `el`.
export function restoreCursor(el, offset) {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let remaining = offset;
	let node = walker.nextNode();
	let last = node;
	while (node) {
		if (remaining <= node.textContent.length) {
			const range = document.createRange();
			range.setStart(node, remaining);
			range.collapse(true);
			const sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
			return;
		}
		remaining -= node.textContent.length;
		last = node;
		node = walker.nextNode();
	}
	if (last) {
		const range = document.createRange();
		range.setStart(last, last.textContent.length);
		range.collapse(true);
		const sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}
}

// Plain-text selection offsets within `el`.
export function getSelectionOffsets(el) {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return null;
	const range = sel.getRangeAt(0);
	if (!el.contains(range.commonAncestorContainer)) return null;
	const pre = document.createRange();
	pre.selectNodeContents(el);
	pre.setEnd(range.startContainer, range.startOffset);
	const start = pre.toString().length;
	pre.setEnd(range.endContainer, range.endOffset);
	const end = pre.toString().length;
	return { start, end };
}

// Split markdown content into plain text + a per-character bold flag.
function parseBold(content) {
	const text = [];
	const bold = [];
	let isBold = false;
	for (let i = 0; i < content.length; i++) {
		if (content[i] === "*" && content[i + 1] === "*") {
			isBold = !isBold;
			i += 1;
			continue;
		}
		text.push(content[i]);
		bold.push(isBold);
	}
	return { text: text.join(""), bold };
}

// Rebuild markdown content from plain text + bold flags.
function serializeBold(text, bold) {
	let out = "";
	let isBold = false;
	for (let i = 0; i < text.length; i++) {
		if (bold[i] && !isBold) {
			out += "**";
			isBold = true;
		} else if (!bold[i] && isBold) {
			out += "**";
			isBold = false;
		}
		out += text[i];
	}
	if (isBold) out += "**";
	return out;
}

// Toggle bold over a plain-text range; returns new markdown content.
export function toggleBoldInContent(content, start, end) {
	if (start >= end) return content;
	const { text, bold } = parseBold(content);
	let allBold = true;
	for (let i = start; i < end && i < bold.length; i++) {
		if (!bold[i]) {
			allBold = false;
			break;
		}
	}
	for (let i = start; i < end && i < bold.length; i++) {
		bold[i] = !allBold;
	}
	return serializeBold(text, bold);
}
