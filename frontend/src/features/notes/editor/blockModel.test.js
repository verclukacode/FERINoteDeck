import { describe, expect, it } from "vitest";
import {
	BLOCK_TYPES,
	INLINE_TYPES,
	LIST_TYPES,
	createBlock,
	ensureTrailingBlock,
} from "./blockModel.js";

describe("BLOCK_TYPES", () => {
	it("contains all 9 expected types", () => {
		expect(BLOCK_TYPES).toEqual([
			"h1",
			"h2",
			"text",
			"bullet",
			"numbered",
			"task",
			"image",
			"separator",
		]);
	});
});

describe("LIST_TYPES", () => {
	it("contains bullet, numbered, task", () => {
		expect(LIST_TYPES).toEqual(
			expect.arrayContaining(["bullet", "numbered", "task"]),
		);
		expect(LIST_TYPES).toHaveLength(3);
	});
});

describe("INLINE_TYPES", () => {
	it("contains text, bullet, numbered, task", () => {
		expect(INLINE_TYPES).toEqual(
			expect.arrayContaining(["text", "bullet", "numbered", "task"]),
		);
		expect(INLINE_TYPES).toHaveLength(4);
	});
});

describe("createBlock", () => {
	it("creates a text block by default", () => {
		const block = createBlock();
		expect(block.type).toBe("text");
		expect(block.content).toBe("");
	});

	it("creates a block with the given type and content", () => {
		const block = createBlock("h1", "Hello");
		expect(block.type).toBe("h1");
		expect(block.content).toBe("Hello");
	});

	it("assigns a non-empty string id", () => {
		const block = createBlock();
		expect(typeof block.id).toBe("string");
		expect(block.id.length).toBeGreaterThan(0);
	});

	it("assigns unique ids for each block", () => {
		const ids = new Set(Array.from({ length: 50 }, () => createBlock().id));
		expect(ids.size).toBe(50);
	});

	it("initialises checked to false", () => {
		expect(createBlock("task").checked).toBe(false);
	});

	it("initialises imageUrl to empty string", () => {
		expect(createBlock("image").imageUrl).toBe("");
	});
});

describe("ensureTrailingBlock", () => {
	it("adds a trailing text block when the last block has content", () => {
		const blocks = [createBlock("text", "hello")];
		const result = ensureTrailingBlock(blocks);
		expect(result).toHaveLength(2);
		expect(result[result.length - 1].type).toBe("text");
		expect(result[result.length - 1].content).toBe("");
	});

	it("does not add a block when the last block is already an empty text block", () => {
		const blocks = [createBlock("text", "hello"), createBlock("text", "")];
		const result = ensureTrailingBlock(blocks);
		expect(result).toHaveLength(2);
	});

	it("adds a trailing block when the last block is a non-text type", () => {
		const blocks = [createBlock("image", "")];
		const result = ensureTrailingBlock(blocks);
		expect(result).toHaveLength(2);
		expect(result[1].type).toBe("text");
	});

	it("adds a trailing block to an empty array", () => {
		const result = ensureTrailingBlock([]);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe("text");
		expect(result[0].content).toBe("");
	});

	it("returns a new array (does not mutate the input)", () => {
		const blocks = [createBlock("text", "hi")];
		const result = ensureTrailingBlock(blocks);
		expect(result).not.toBe(blocks);
	});

	it("returns the same array reference when no change needed", () => {
		const blocks = [createBlock("text", "")];
		const result = ensureTrailingBlock(blocks);
		// Same reference (no new block needed) — function returns original array
		expect(result).toBe(blocks);
	});
});
