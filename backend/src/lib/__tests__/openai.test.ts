import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt } from "../openai";

describe("buildChatSystemPrompt", () => {
	it("substitutes the title and content placeholders", () => {
		const out = buildChatSystemPrompt("My Note", "Some body text.");
		expect(out).toContain("NOTE TITLE: My Note");
		expect(out).toContain("NOTE CONTENT:");
		expect(out).toContain("Some body text.");
		expect(out).not.toContain("{{title}}");
		expect(out).not.toContain("{{content}}");
	});

	it("falls back to an empty-note placeholder when content is empty", () => {
		const out = buildChatSystemPrompt("Empty", "");
		expect(out).toContain("(this note is empty)");
	});

	it("falls back to the empty-note placeholder when content is just whitespace-free empty string", () => {
		// "" is falsy so the helper picks the placeholder; non-empty strings
		// are kept verbatim so that whitespace-only notes still travel as-is.
		const empty = buildChatSystemPrompt("T", "");
		const space = buildChatSystemPrompt("T", "   ");
		expect(empty).toContain("(this note is empty)");
		expect(space).not.toContain("(this note is empty)");
		expect(space).toMatch(/NOTE CONTENT:\n {3}/);
	});

	it("includes the plain-text formatting rule", () => {
		const out = buildChatSystemPrompt("T", "C");
		expect(out).toMatch(/Use plain text/);
	});

	it("only replaces the first occurrence of each placeholder (template owns one of each)", () => {
		// Title containing the content placeholder string should NOT trigger a
		// second substitution — guards against silly user-controlled injection
		// into the system prompt.
		const tricky = buildChatSystemPrompt("Has {{content}} marker", "real body");
		expect(tricky).toContain("Has {{content}} marker");
		expect(tricky).toContain("real body");
	});
});
