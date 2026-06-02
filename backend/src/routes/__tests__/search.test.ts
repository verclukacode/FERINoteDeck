import { describe, expect, it } from "vitest";
import { scoreField, snippet } from "../search";

describe("scoreField", () => {
	it("returns 0 for null field", () => {
		expect(scoreField(null, "hello")).toBe(0);
	});

	it("returns 0 for undefined field", () => {
		expect(scoreField(undefined, "hello")).toBe(0);
	});

	it("returns 0 for empty string field", () => {
		expect(scoreField("", "hello")).toBe(0);
	});

	it("returns 0 when term is not found", () => {
		expect(scoreField("foo bar baz", "xyz")).toBe(0);
	});

	it("returns 1000 for exact match", () => {
		expect(scoreField("hello", "hello")).toBe(1000);
	});

	it("exact match is case-insensitive", () => {
		expect(scoreField("HELLO", "hello")).toBe(1000);
	});

	it("returns 500 for prefix match (term at index 0, not exact)", () => {
		expect(scoreField("hello world", "hello")).toBe(500);
	});

	it("returns position-based score for substring match", () => {
		// "foo hello bar" — term starts at index 4
		// score = max(10, 100 - 4) = 96
		expect(scoreField("foo hello bar", "hello")).toBe(96);
	});

	it("score decreases as match position increases", () => {
		const early = scoreField("hello at start and more", "hello"); // i=0 → 500
		const late = scoreField("text text text hello", "hello"); // i=15 → max(10, 85) = 85
		expect(early).toBeGreaterThan(late);
	});

	it("returns minimum floor of 10 for very late matches", () => {
		// term at position 95 → max(10, 100-95) = max(10, 5) = 10
		const longPrefix = `${"x".repeat(95)}term`;
		expect(scoreField(longPrefix, "term")).toBe(10);
	});

	it("score ranking: exact > prefix > middle substring", () => {
		const exact = scoreField("notes", "notes");
		const prefix = scoreField("notes app", "notes");
		const middle = scoreField("my notes app", "notes");
		expect(exact).toBeGreaterThan(prefix);
		expect(prefix).toBeGreaterThan(middle);
	});
});

describe("snippet", () => {
	it("returns empty string for null text", () => {
		expect(snippet(null, "term")).toBe("");
	});

	it("returns empty string for undefined text", () => {
		expect(snippet(undefined, "term")).toBe("");
	});

	it("returns beginning of text when term is not found", () => {
		expect(snippet("hello world", "xyz")).toBe("hello world");
	});

	it("returns full short text when term is found and text fits in window", () => {
		expect(snippet("Hello world", "world")).toBe("Hello world");
	});

	it("adds leading ellipsis when term is deep in a long text", () => {
		// 35 'a's then '_term_bbb': term starts at index 36 (> 33)
		const text = `${"a".repeat(35)}_term_bbb`;
		const result = snippet(text, "term");
		expect(result.startsWith("…")).toBe(true);
		expect(result).toContain("term");
	});

	it("adds trailing ellipsis when text extends beyond the window", () => {
		// term at start, followed by 200 chars
		const text = `term${"b".repeat(200)}`;
		const result = snippet(text, "term");
		expect(result.endsWith("…")).toBe(true);
		expect(result.startsWith("term")).toBe(true);
	});

	it("normalises multiple spaces and newlines to a single space", () => {
		const result = snippet("hello   world\n\nfoo", "hello");
		expect(result).not.toMatch(/\s{2,}/);
	});

	it("is case-insensitive when locating the term", () => {
		const result = snippet("Hello World", "hello");
		expect(result).toContain("Hello");
	});
});
