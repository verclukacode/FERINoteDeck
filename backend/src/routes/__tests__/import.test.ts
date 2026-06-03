import { describe, expect, it } from "vitest";
import type { ExtractedFile } from "../../lib/fileExtraction";
import { NO_API_SUFFIX, buildDummyNote } from "../import";

function makeText(filename: string, text = "hello"): ExtractedFile {
	return { kind: "text", filename, text };
}

function makeImage(
	filename: string,
	imageUrl = "https://example.com/img.png",
): ExtractedFile {
	return { kind: "image", filename, text: "", imageUrl };
}

describe("NO_API_SUFFIX", () => {
	it("equals (no-api)", () => {
		expect(NO_API_SUFFIX).toBe("(no-api)");
	});
});

describe("buildDummyNote", () => {
	it("returns fixed title", () => {
		const { title } = buildDummyNote([]);
		expect(title).toBe("Magical Import — Dummy Note");
	});

	it("content is wrapped in NoteDeckMD sentinels", () => {
		const { content } = buildDummyNote([]);
		expect(content.startsWith("<<<NoteDeckMD>>>")).toBe(true);
		expect(content.endsWith("<<<NoteDeckMD>>>")).toBe(true);
	});

	it("lists text file names when only text files are present", () => {
		const { content } = buildDummyNote([
			makeText("notes.pdf"),
			makeText("slides.pptx"),
		]);
		expect(content).toContain("- notes.pdf");
		expect(content).toContain("- slides.pptx");
	});

	it("shows 'No text files this time.' when only image files are present", () => {
		const { content } = buildDummyNote([makeImage("photo.png")]);
		expect(content).toContain("No text files this time.");
	});

	it("lists image files by numbered list when images are present", () => {
		const { content } = buildDummyNote([
			makeImage("a.png"),
			makeImage("b.jpg"),
		]);
		expect(content).toContain("1. a.png");
		expect(content).toContain("2. b.jpg");
	});

	it("embeds image markdown for each image", () => {
		const { content } = buildDummyNote([
			makeImage("cat.png", "https://x.com/cat.png"),
		]);
		expect(content).toContain("![Preview of cat.png](https://x.com/cat.png)");
	});

	it("skips image markdown embed when imageUrl is missing", () => {
		const img: ExtractedFile = {
			kind: "image",
			filename: "no-url.png",
			text: "",
			imageUrl: undefined,
		};
		const { content } = buildDummyNote([img]);
		expect(content).not.toContain("![Preview of no-url.png]");
	});

	it("handles mixed text and image files", () => {
		const { content } = buildDummyNote([
			makeText("doc.pdf"),
			makeImage("pic.png"),
		]);
		expect(content).toContain("- doc.pdf");
		expect(content).toContain("1. pic.png");
		expect(content).toContain("![Preview of pic.png]");
	});

	it("mentions NO_API_SUFFIX in closing thought", () => {
		const { content } = buildDummyNote([]);
		expect(content).toContain(NO_API_SUFFIX);
	});

	it("includes the horizontal rule separator", () => {
		const { content } = buildDummyNote([]);
		expect(content).toContain("---");
	});

	it("works with empty input array", () => {
		const { title, content } = buildDummyNote([]);
		expect(title).toBe("Magical Import — Dummy Note");
		expect(content).toContain("No text files this time.");
		expect(content).not.toContain("Images attached:");
	});
});
