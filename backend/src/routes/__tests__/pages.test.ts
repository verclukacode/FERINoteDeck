import { describe, expect, it } from "vitest";
import {
	CHAT_MAX_CHARS,
	CHAT_MAX_MESSAGES,
	SENTINEL,
	stripContentSentinel,
	validateChatMessages,
} from "../pages";

describe("stripContentSentinel", () => {
	it("removes the leading sentinel and trims", () => {
		const input = `${SENTINEL}\nhello\n`;
		expect(stripContentSentinel(input)).toBe("hello");
	});

	it("removes the trailing sentinel and trims", () => {
		const input = `hello\n${SENTINEL}`;
		expect(stripContentSentinel(input)).toBe("hello");
	});

	it("removes sentinels appearing more than once", () => {
		const input = `${SENTINEL}\nbody\n${SENTINEL}\nmore\n${SENTINEL}`;
		expect(stripContentSentinel(input)).toBe("body\n\nmore");
	});

	it("returns the trimmed body when no sentinel is present", () => {
		expect(stripContentSentinel("  hello world  ")).toBe("hello world");
	});

	it("returns an empty string for content that is only a sentinel", () => {
		expect(stripContentSentinel(SENTINEL)).toBe("");
	});

	it("returns an empty string for an empty input", () => {
		expect(stripContentSentinel("")).toBe("");
	});
});

describe("validateChatMessages", () => {
	it("rejects a non-array input", () => {
		const r = validateChatMessages("nope");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/must be an array/);
	});

	it("rejects an empty array", () => {
		const r = validateChatMessages([]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/cannot be empty/);
	});

	it("rejects more than CHAT_MAX_MESSAGES", () => {
		const tooMany = Array.from({ length: CHAT_MAX_MESSAGES + 1 }, () => ({
			role: "user",
			content: "hi",
		}));
		const r = validateChatMessages(tooMany);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/Conversation limit/);
	});

	it("accepts exactly CHAT_MAX_MESSAGES turns", () => {
		const right = Array.from({ length: CHAT_MAX_MESSAGES }, () => ({
			role: "user",
			content: "hi",
		}));
		const r = validateChatMessages(right);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.messages).toHaveLength(CHAT_MAX_MESSAGES);
	});

	it("rejects a message with no role", () => {
		const r = validateChatMessages([{ content: "hi" }]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/role user or assistant/);
	});

	it("rejects a system role (only user/assistant are allowed)", () => {
		const r = validateChatMessages([{ role: "system", content: "hi" }]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/role user or assistant/);
	});

	it("rejects a null entry", () => {
		const r = validateChatMessages([null]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/role user or assistant/);
	});

	it("rejects an entry with whitespace-only content", () => {
		const r = validateChatMessages([{ role: "user", content: "   " }]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/cannot be empty/);
	});

	it("rejects content over CHAT_MAX_CHARS", () => {
		const r = validateChatMessages([
			{ role: "user", content: "x".repeat(CHAT_MAX_CHARS + 1) },
		]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/exceeds/);
	});

	it("accepts content at exactly CHAT_MAX_CHARS", () => {
		const r = validateChatMessages([
			{ role: "user", content: "x".repeat(CHAT_MAX_CHARS) },
		]);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.messages[0].content).toHaveLength(CHAT_MAX_CHARS);
	});

	it("returns a normalized typed array for a happy-path conversation", () => {
		const r = validateChatMessages([
			{ role: "user", content: "Q1" },
			{ role: "assistant", content: "A1" },
			{ role: "user", content: "Q2" },
		]);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.messages).toEqual([
				{ role: "user", content: "Q1" },
				{ role: "assistant", content: "A1" },
				{ role: "user", content: "Q2" },
			]);
		}
	});

	it("coerces non-string content to string via String()", () => {
		const r = validateChatMessages([{ role: "user", content: 42 }]);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.messages[0].content).toBe("42");
	});

	it("treats missing content as empty and rejects it", () => {
		const r = validateChatMessages([{ role: "user" }]);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/cannot be empty/);
	});
});
