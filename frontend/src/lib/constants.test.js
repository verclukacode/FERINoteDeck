import { describe, expect, it } from "vitest";
import {
	DEFAULT_FOLDER_COLOR,
	FOLDER_COLORS,
	STORAGE_KEYS,
	VIEW,
	folderHex,
} from "./constants.js";

describe("FOLDER_COLORS", () => {
	it("has exactly 6 colors", () => {
		expect(FOLDER_COLORS).toHaveLength(6);
	});

	it("each color has a string key and a hex string starting with #", () => {
		for (const color of FOLDER_COLORS) {
			expect(typeof color.key).toBe("string");
			expect(color.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it("contains red, orange, pink, green, blue, purple keys", () => {
		const keys = FOLDER_COLORS.map((c) => c.key);
		expect(keys).toEqual(
			expect.arrayContaining([
				"red",
				"orange",
				"pink",
				"green",
				"blue",
				"purple",
			]),
		);
	});
});

describe("DEFAULT_FOLDER_COLOR", () => {
	it("is 'blue'", () => {
		expect(DEFAULT_FOLDER_COLOR).toBe("blue");
	});

	it("corresponds to a key that exists in FOLDER_COLORS", () => {
		const keys = FOLDER_COLORS.map((c) => c.key);
		expect(keys).toContain(DEFAULT_FOLDER_COLOR);
	});
});

describe("folderHex", () => {
	it("returns correct hex for 'blue'", () => {
		expect(folderHex("blue")).toBe("#499ef3");
	});

	it("returns correct hex for 'red'", () => {
		expect(folderHex("red")).toBe("#ff7070");
	});

	it("returns correct hex for 'green'", () => {
		expect(folderHex("green")).toBe("#2fd5b1");
	});

	it("returns correct hex for 'purple'", () => {
		expect(folderHex("purple")).toBe("#7092ff");
	});

	it("falls back to first color's hex for an unknown key", () => {
		const fallback = FOLDER_COLORS[0].hex;
		expect(folderHex("nonexistent")).toBe(fallback);
	});

	it("falls back to first color's hex for empty string", () => {
		const fallback = FOLDER_COLORS[0].hex;
		expect(folderHex("")).toBe(fallback);
	});
});

describe("STORAGE_KEYS", () => {
	it("has a 'folders' key with string value", () => {
		expect(typeof STORAGE_KEYS.folders).toBe("string");
		expect(STORAGE_KEYS.folders.length).toBeGreaterThan(0);
	});

	it("has a 'pages' key with string value", () => {
		expect(typeof STORAGE_KEYS.pages).toBe("string");
		expect(STORAGE_KEYS.pages.length).toBeGreaterThan(0);
	});

	it("folders and pages keys are distinct", () => {
		expect(STORAGE_KEYS.folders).not.toBe(STORAGE_KEYS.pages);
	});
});

describe("VIEW", () => {
	it("NOTES is 'notes'", () => {
		expect(VIEW.NOTES).toBe("notes");
	});

	it("FLASHCARDS is 'flashcards'", () => {
		expect(VIEW.FLASHCARDS).toBe("flashcards");
	});

	it("NOTES and FLASHCARDS are distinct", () => {
		expect(VIEW.NOTES).not.toBe(VIEW.FLASHCARDS);
	});
});
