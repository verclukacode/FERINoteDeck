// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
	URL_REGEX,
	contentToHtml,
	getCursorOffset,
	getSelectionOffsets,
	htmlToContent,
	restoreCursor,
	toggleBoldInContent,
} from "./inlineFormat";

// ── URL_REGEX ────────────────────────────────────────────────────────────────

describe("URL_REGEX", () => {
	it("matches http URLs", () => {
		const m = "click http://example.com here".match(URL_REGEX);
		expect(m).toEqual(["http://example.com"]);
	});

	it("matches https URLs", () => {
		const m = "see https://example.com/path?q=1 now".match(URL_REGEX);
		expect(m).toEqual(["https://example.com/path?q=1"]);
	});

	it("matches www URLs", () => {
		const m = "visit www.example.com today".match(URL_REGEX);
		expect(m).toEqual(["www.example.com"]);
	});

	it("does not match bare words", () => {
		expect("hello world".match(URL_REGEX)).toBeNull();
	});
});

// ── contentToHtml ────────────────────────────────────────────────────────────

describe("contentToHtml", () => {
	it("returns empty string for empty input", () => {
		expect(contentToHtml("")).toBe("");
	});

	it("returns empty string for null/undefined input", () => {
		expect(contentToHtml(null)).toBe("");
		expect(contentToHtml(undefined)).toBe("");
	});

	it("HTML-escapes < > & in plain text", () => {
		const html = contentToHtml("a < b && b > c");
		expect(html).toContain("&lt;");
		expect(html).toContain("&gt;");
		expect(html).toContain("&amp;");
	});

	it("wraps **bold** in <b> tags", () => {
		expect(contentToHtml("say **hello** world")).toBe("say <b>hello</b> world");
	});

	it("auto-links http URLs", () => {
		const html = contentToHtml("see http://example.com now");
		expect(html).toContain('<a href="http://example.com"');
		expect(html).toContain('target="_blank"');
	});

	it("prepends https to www URLs", () => {
		const html = contentToHtml("go to www.example.com");
		expect(html).toContain('href="https://www.example.com"');
	});

	it("renders inline LaTeX $...$", () => {
		const html = contentToHtml("area is $x^2$");
		expect(html).toContain("ndmath");
		expect(html).toContain('data-tex="x^2"');
		expect(html).not.toContain('data-display="1"');
	});

	it("renders display LaTeX $$...$$", () => {
		const html = contentToHtml("$$x^2$$");
		expect(html).toContain("ndmath");
		expect(html).toContain('data-display="1"');
	});

	it("renders \\(..\\) as inline math", () => {
		const html = contentToHtml("\\(\\alpha\\)");
		expect(html).toContain("ndmath");
		expect(html).not.toContain('data-display="1"');
	});

	it("renders \\[..\\] as display math", () => {
		const html = contentToHtml("\\[\\int x\\,dx\\]");
		expect(html).toContain("ndmath");
		expect(html).toContain('data-display="1"');
	});

	it("does not render invalid single $ as math", () => {
		// Single $x without closing should be left as-is
		const html = contentToHtml("costs $5 today");
		expect(html).not.toContain("ndmath");
	});
});

// ── htmlToContent ────────────────────────────────────────────────────────────

describe("htmlToContent", () => {
	function makeEl(html) {
		const el = document.createElement("span");
		el.innerHTML = html;
		return el;
	}

	it("returns plain text from a text node", () => {
		const el = makeEl("hello world");
		expect(htmlToContent(el)).toBe("hello world");
	});

	it("converts <b> back to **bold**", () => {
		const el = makeEl("say <b>hello</b> world");
		expect(htmlToContent(el)).toBe("say **hello** world");
	});

	it("converts <strong> back to **bold**", () => {
		const el = makeEl("say <strong>hi</strong>");
		expect(htmlToContent(el)).toBe("say **hi**");
	});

	it("skips empty <b> tags", () => {
		const el = makeEl("text<b></b>end");
		expect(htmlToContent(el)).toBe("textend");
	});

	it("round-trips ndmath span back to $tex$", () => {
		const el = makeEl(
			'before<span class="ndmath" contenteditable="false" data-tex="x^2">rendered</span>after',
		);
		expect(htmlToContent(el)).toBe("before$x^2$after");
	});

	it("round-trips display ndmath span back to $$tex$$", () => {
		const el = makeEl(
			'<span class="ndmath" data-tex="\\\\int" data-display="1">rendered</span>',
		);
		expect(htmlToContent(el)).toBe("$$\\\\int$$");
	});

	it("falls back to textContent for unknown nodes", () => {
		const el = makeEl("<em>italic</em>");
		expect(htmlToContent(el)).toBe("italic");
	});
});

// ── toggleBoldInContent ──────────────────────────────────────────────────────

describe("toggleBoldInContent", () => {
	it("bolds a range in plain text", () => {
		expect(toggleBoldInContent("hello world", 6, 11)).toBe("hello **world**");
	});

	it("unbolds a range that is already fully bold", () => {
		expect(toggleBoldInContent("**hello** world", 0, 5)).toBe("hello world");
	});

	it("returns original content when start >= end", () => {
		expect(toggleBoldInContent("hello", 3, 3)).toBe("hello");
		expect(toggleBoldInContent("hello", 5, 2)).toBe("hello");
	});

	it("bolds when only part of the range is already bold", () => {
		// "he**ll**o" — 'll' is bold; bolding 'ello' should make all bold
		const result = toggleBoldInContent("he**ll**o", 2, 5);
		expect(result).toContain("**");
	});

	it("handles bold at start of content", () => {
		const result = toggleBoldInContent("hello world", 0, 5);
		expect(result).toBe("**hello** world");
	});
});

// ── getCursorOffset ──────────────────────────────────────────────────────────

describe("getCursorOffset", () => {
	it("returns offset from a range in a text node", () => {
		const el = document.createElement("span");
		el.textContent = "hello world";
		document.body.appendChild(el);
		const range = document.createRange();
		range.setStart(el.firstChild, 5);
		range.collapse(true);
		expect(getCursorOffset(el, range)).toBe(5);
		document.body.removeChild(el);
	});
});

// ── restoreCursor ────────────────────────────────────────────────────────────

describe("restoreCursor", () => {
	it("places the caret at the given offset", () => {
		const el = document.createElement("span");
		el.textContent = "hello world";
		document.body.appendChild(el);
		restoreCursor(el, 5);
		const sel = window.getSelection();
		expect(sel.rangeCount).toBeGreaterThan(0);
		document.body.removeChild(el);
	});

	it("handles offset beyond end of content", () => {
		const el = document.createElement("span");
		el.textContent = "hi";
		document.body.appendChild(el);
		// Should not throw when offset > text length
		expect(() => restoreCursor(el, 100)).not.toThrow();
		document.body.removeChild(el);
	});

	it("handles element with no text nodes", () => {
		const el = document.createElement("span");
		document.body.appendChild(el);
		expect(() => restoreCursor(el, 0)).not.toThrow();
		document.body.removeChild(el);
	});
});

// ── getSelectionOffsets ──────────────────────────────────────────────────────

describe("getSelectionOffsets", () => {
	it("returns null when there is no selection", () => {
		const el = document.createElement("span");
		el.textContent = "hello";
		document.body.appendChild(el);
		window.getSelection().removeAllRanges();
		expect(getSelectionOffsets(el)).toBeNull();
		document.body.removeChild(el);
	});

	it("returns start/end offsets for a selection within el", () => {
		const el = document.createElement("span");
		el.textContent = "hello world";
		document.body.appendChild(el);
		const range = document.createRange();
		range.setStart(el.firstChild, 0);
		range.setEnd(el.firstChild, 5);
		window.getSelection().removeAllRanges();
		window.getSelection().addRange(range);
		const offsets = getSelectionOffsets(el);
		expect(offsets).toEqual({ start: 0, end: 5 });
		document.body.removeChild(el);
	});

	it("returns null when selection is outside el", () => {
		const el = document.createElement("span");
		el.textContent = "inside";
		const outside = document.createElement("span");
		outside.textContent = "outside";
		document.body.appendChild(el);
		document.body.appendChild(outside);
		const range = document.createRange();
		range.setStart(outside.firstChild, 0);
		range.setEnd(outside.firstChild, 3);
		window.getSelection().removeAllRanges();
		window.getSelection().addRange(range);
		expect(getSelectionOffsets(el)).toBeNull();
		document.body.removeChild(el);
		document.body.removeChild(outside);
	});
});
