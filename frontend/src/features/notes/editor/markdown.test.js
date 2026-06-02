import { describe, expect, it } from "vitest";
import { parse, serialize } from "./markdown.js";

// Helper: compare blocks ignoring the auto-generated `id` field.
function withoutIds(blocks) {
	return blocks.map(({ id: _id, ...rest }) => rest);
}

const SENTINEL = "<<<NoteDeckMD>>>";

describe("serialize", () => {
	it("wraps output in SENTINEL markers", () => {
		const out = serialize([{ type: "text", content: "hello" }]);
		expect(out.startsWith(`${SENTINEL}\n`)).toBe(true);
		expect(out.endsWith(`\n${SENTINEL}`)).toBe(true);
	});

	it("serializes a h1 block", () => {
		const out = serialize([{ type: "h1", content: "Title" }]);
		expect(out).toContain("# Title");
	});

	it("serializes a h2 block", () => {
		const out = serialize([{ type: "h2", content: "Sub" }]);
		expect(out).toContain("## Sub");
	});

	it("serializes a bullet block", () => {
		const out = serialize([{ type: "bullet", content: "item" }]);
		expect(out).toContain("- item");
	});

	it("serializes numbered blocks with incrementing counter", () => {
		const out = serialize([
			{ type: "numbered", content: "first" },
			{ type: "numbered", content: "second" },
		]);
		expect(out).toContain("1. first");
		expect(out).toContain("2. second");
	});

	it("resets numbered counter on a non-numbered block between numbered blocks", () => {
		const out = serialize([
			{ type: "numbered", content: "first" },
			{ type: "text", content: "break" },
			{ type: "numbered", content: "restart" },
		]);
		expect(out).toContain("1. first");
		expect(out).toContain("1. restart");
	});

	it("serializes an unchecked task block", () => {
		const out = serialize([
			{ type: "task", content: "do this", checked: false },
		]);
		expect(out).toContain("- [ ] do this");
	});

	it("serializes a checked task block", () => {
		const out = serialize([{ type: "task", content: "done", checked: true }]);
		expect(out).toContain("- [x] done");
	});

	it("serializes an image block", () => {
		const out = serialize([
			{
				type: "image",
				content: "alt text",
				imageUrl: "/api/images/foo.png",
			},
		]);
		expect(out).toContain("![alt text](/api/images/foo.png)");
	});

	it("serializes a separator block", () => {
		const out = serialize([{ type: "separator", content: "" }]);
		expect(out).toContain("---");
	});

	it("escapes text lines that start with a block marker", () => {
		const out = serialize([{ type: "text", content: "# not a heading" }]);
		expect(out).toContain("\\# not a heading");
	});

	it("escapes text lines that start with '- '", () => {
		const out = serialize([{ type: "text", content: "- not a bullet" }]);
		expect(out).toContain("\\- not a bullet");
	});

	it("does not escape plain text", () => {
		const out = serialize([{ type: "text", content: "just text" }]);
		expect(out).toContain("just text");
		expect(out).not.toContain("\\just text");
	});
});

describe("parse", () => {
	function wrap(lines) {
		return `${SENTINEL}\n${lines.join("\n")}\n${SENTINEL}`;
	}

	it("parses a h1 line", () => {
		const result = withoutIds(parse(wrap(["# Hello"])));
		expect(result[0]).toMatchObject({ type: "h1", content: "Hello" });
	});

	it("parses a h2 line", () => {
		const result = withoutIds(parse(wrap(["## World"])));
		expect(result[0]).toMatchObject({ type: "h2", content: "World" });
	});

	it("parses a bullet line", () => {
		const result = withoutIds(parse(wrap(["- item one"])));
		expect(result[0]).toMatchObject({ type: "bullet", content: "item one" });
	});

	it("parses a numbered list line", () => {
		const result = withoutIds(parse(wrap(["3. third"]))); // number is ignored
		expect(result[0]).toMatchObject({ type: "numbered", content: "third" });
	});

	it("parses an unchecked task", () => {
		const result = withoutIds(parse(wrap(["- [ ] buy milk"])));
		expect(result[0]).toMatchObject({
			type: "task",
			content: "buy milk",
			checked: false,
		});
	});

	it("parses a checked task (lowercase x)", () => {
		const result = withoutIds(parse(wrap(["- [x] done"])));
		expect(result[0]).toMatchObject({
			type: "task",
			content: "done",
			checked: true,
		});
	});

	it("parses a checked task (uppercase X)", () => {
		const result = withoutIds(parse(wrap(["- [X] done"])));
		expect(result[0]).toMatchObject({
			type: "task",
			content: "done",
			checked: true,
		});
	});

	it("parses a separator line", () => {
		const result = withoutIds(parse(wrap(["---"])));
		expect(result[0]).toMatchObject({ type: "separator" });
	});

	it("parses an image block", () => {
		const result = withoutIds(parse(wrap(["![caption](/api/images/x.png)"])));
		expect(result[0]).toMatchObject({
			type: "image",
			content: "caption",
			imageUrl: "/api/images/x.png",
		});
	});

	it("parses image with empty alt text", () => {
		const result = withoutIds(parse(wrap(["![](/api/images/x.png)"])));
		expect(result[0]).toMatchObject({
			type: "image",
			imageUrl: "/api/images/x.png",
		});
	});

	it("unescapes backslash-prefixed text lines", () => {
		const result = withoutIds(parse(wrap(["\\# not a heading"])));
		expect(result[0]).toMatchObject({
			type: "text",
			content: "# not a heading",
		});
	});

	it("strips SENTINEL markers and does not include them as blocks", () => {
		const result = parse(wrap(["plain text"]));
		for (const block of result) {
			expect(block.content).not.toContain(SENTINEL);
		}
	});

	it("returns at least one block for empty content", () => {
		const result = parse("");
		expect(result.length).toBeGreaterThanOrEqual(1);
	});

	it("parses content without SENTINEL (plain markdown fallback)", () => {
		const result = withoutIds(parse("# Raw heading"));
		expect(result[0]).toMatchObject({ type: "h1", content: "Raw heading" });
	});
});

describe("parse/serialize round-trip", () => {
	function roundTrip(blocks) {
		const markdown = serialize(blocks);
		return withoutIds(parse(markdown));
	}

	it("round-trips h1 content", () => {
		const result = roundTrip([{ type: "h1", content: "My Title" }]);
		expect(result[0]).toMatchObject({ type: "h1", content: "My Title" });
	});

	it("round-trips a checked task", () => {
		const result = roundTrip([
			{ type: "task", content: "buy milk", checked: true },
		]);
		expect(result[0]).toMatchObject({
			type: "task",
			content: "buy milk",
			checked: true,
		});
	});

	it("round-trips an image block", () => {
		const result = roundTrip([
			{
				type: "image",
				content: "screenshot",
				imageUrl: "/api/images/s.png",
			},
		]);
		expect(result[0]).toMatchObject({
			type: "image",
			content: "screenshot",
			imageUrl: "/api/images/s.png",
		});
	});

	it("round-trips text that looks like a block marker", () => {
		const result = roundTrip([{ type: "text", content: "# fake heading" }]);
		expect(result[0]).toMatchObject({
			type: "text",
			content: "# fake heading",
		});
	});

	it("round-trips multiple mixed blocks", () => {
		const blocks = [
			{ type: "h1", content: "Title" },
			{ type: "text", content: "Intro paragraph." },
			{ type: "bullet", content: "point A" },
			{ type: "bullet", content: "point B" },
			{ type: "separator", content: "" },
			{ type: "text", content: "Footer." },
		];
		const result = roundTrip(blocks);
		expect(result).toHaveLength(blocks.length);
		for (let i = 0; i < blocks.length; i++) {
			expect(result[i]).toMatchObject({
				type: blocks[i].type,
				content: blocks[i].content,
			});
		}
	});
});
