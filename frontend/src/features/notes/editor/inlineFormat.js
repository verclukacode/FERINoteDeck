// Inline formatting helpers for text-bearing blocks. Block content is stored
// as markdown (`**bold**`, `$x^2$` for LaTeX); URLs are auto-detected, never
// stored as markup.
import katex from "katex";

export const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+/g;

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeAttr(s) {
	return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderMath(tex, displayMode) {
	try {
		return katex.renderToString(tex, {
			displayMode,
			throwOnError: false,
			output: "html",
		});
	} catch {
		return escapeHtml(
			(displayMode ? "$$" : "$") + tex + (displayMode ? "$$" : "$"),
		);
	}
}

// Match the longest math delimiter starting at the head of `s`, returning
// { tex, display, length } or null. Supports:
//   $$...$$, $...$               — TeX / pandoc style
//   \[...\], \(...\)             — LaTeX standard
//   [ ... \], ( ... \)           — leading-backslash-stripped (markdown.js
//                                  treats a literal "\" at line start as an
//                                  escape and removes it; allow it back).
// The bracket/paren forms only match if the body contains a `\command` so
// plain text like "(see fig)" isn't mistaken for math.
function matchMathAt(s) {
	let m = s.match(/^\$\$([^$\n]+?)\$\$/);
	if (m) return { tex: m[1], display: true, length: m[0].length };
	m = s.match(/^\$([^$\n]+?)\$/);
	if (m) return { tex: m[1], display: false, length: m[0].length };
	m = s.match(/^\\?\[([\s\S]+?)\\\]/);
	if (m && /\\\w/.test(m[1]))
		return { tex: m[1], display: true, length: m[0].length };
	m = s.match(/^\\?\(([\s\S]+?)\\\)/);
	if (m && /\\\w/.test(m[1]))
		return { tex: m[1], display: false, length: m[0].length };
	return null;
}

// Walk the raw content one char at a time, attempting to consume a math
// delimiter at each position. Non-math chars are HTML-escaped; math is
// replaced by an atomic contenteditable=false span carrying `data-tex` (and
// `data-display="1"` for display mode) so htmlToContent can round-trip.
function escapeWithMath(content) {
	let out = "";
	let i = 0;
	while (i < content.length) {
		const rest = content.slice(i);
		const m = matchMathAt(rest);
		if (m) {
			const rendered = renderMath(m.tex, m.display);
			const attr = `data-tex="${escapeAttr(m.tex)}"${m.display ? ' data-display="1"' : ""}`;
			out += `<span class="ndmath" contenteditable="false" ${attr}>${rendered}</span>`;
			i += m.length;
			continue;
		}
		const c = content[i];
		out += c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c;
		i++;
	}
	return out;
}

// markdown content -> innerHTML for a contentEditable block.
export function contentToHtml(content) {
	let html = escapeWithMath(content || "");
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
		} else if (
			name === "SPAN" &&
			node.classList?.contains("ndmath") &&
			node.getAttribute("data-tex") != null
		) {
			const tex = node.getAttribute("data-tex");
			const display = node.getAttribute("data-display") === "1";
			result += display ? `$$${tex}$$` : `$${tex}$`;
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
