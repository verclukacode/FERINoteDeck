import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kindFromExtension } from "../fileExtraction";
import {
	extractDocx,
	extractPdf,
	extractPptx,
	extractText,
} from "../fileExtraction";

// ── kindFromExtension ─────────────────────────────────────────────────────────

describe("kindFromExtension", () => {
	it("maps .pdf → pdf", () => expect(kindFromExtension(".pdf")).toBe("pdf"));
	it("maps .docx → docx", () =>
		expect(kindFromExtension(".docx")).toBe("docx"));
	it("maps .pptx → pptx", () =>
		expect(kindFromExtension(".pptx")).toBe("pptx"));
	it("maps .txt → text", () => expect(kindFromExtension(".txt")).toBe("text"));
	it("maps .md → text", () => expect(kindFromExtension(".md")).toBe("text"));
	it("maps .png → image", () =>
		expect(kindFromExtension(".png")).toBe("image"));
	it("maps .jpg → image", () =>
		expect(kindFromExtension(".jpg")).toBe("image"));
	it("maps .jpeg → image", () =>
		expect(kindFromExtension(".jpeg")).toBe("image"));
	it("maps .gif → image", () =>
		expect(kindFromExtension(".gif")).toBe("image"));
	it("maps .webp → image", () =>
		expect(kindFromExtension(".webp")).toBe("image"));

	it("is case-insensitive (.PDF)", () =>
		expect(kindFromExtension(".PDF")).toBe("pdf"));
	it("is case-insensitive (.DOCX)", () =>
		expect(kindFromExtension(".DOCX")).toBe("docx"));
	it("is case-insensitive (.TXT)", () =>
		expect(kindFromExtension(".TXT")).toBe("text"));

	it("returns null for unknown extensions", () => {
		expect(kindFromExtension(".xyz")).toBeNull();
		expect(kindFromExtension(".svg")).toBeNull();
		expect(kindFromExtension(".html")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(kindFromExtension("")).toBeNull();
	});

	it("returns null for extension without dot", () => {
		expect(kindFromExtension("pdf")).toBeNull();
	});
});

// ── extractPdf ────────────────────────────────────────────────────────────────

describe("extractPdf", () => {
	it("returns a string from a minimal valid PDF", async () => {
		// Minimal 1-page empty PDF that pdf-parse can handle
		const minimalPdf = Buffer.from(
			"%PDF-1.4\n" +
				"1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n" +
				"2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n" +
				"3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>endobj\n" +
				"xref\n0 4\n" +
				"0000000000 65535 f \n" +
				"0000000009 00000 n \n" +
				"0000000058 00000 n \n" +
				"0000000115 00000 n \n" +
				"trailer<</Size 4 /Root 1 0 R>>\n" +
				"startxref\n190\n%%EOF\n",
			"ascii",
		);
		const dir = join(tmpdir(), `fe-pdf-${Date.now()}`);
		await mkdir(dir, { recursive: true });
		const filepath = join(dir, "minimal.pdf");
		await writeFile(filepath, minimalPdf);
		const result = await extractPdf(filepath);
		expect(typeof result).toBe("string");
		await rm(dir, { recursive: true, force: true });
	});
});

// ── extractDocx ───────────────────────────────────────────────────────────────

describe("extractDocx", () => {
	it("extracts text from a minimal valid .docx (Word XML zip)", async () => {
		const JSZip = (await import("jszip")).default;
		const tmpDir2 = join(tmpdir(), `fe-docx-${Date.now()}`);
		await mkdir(tmpDir2, { recursive: true });

		const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
		const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello from DOCX</w:t></w:r></w:p>
  </w:body>
</w:document>`;

		const zip = new JSZip();
		zip.file("[Content_Types].xml", contentTypes);
		zip.file("word/document.xml", documentXml);
		const buf = await zip.generateAsync({ type: "nodebuffer" });

		const filepath = join(tmpDir2, "test.docx");
		await writeFile(filepath, buf);

		const result = await extractDocx(filepath);
		expect(result).toContain("Hello from DOCX");

		await rm(tmpDir2, { recursive: true, force: true });
	});

	it("returns empty string for a docx with no text content", async () => {
		const JSZip = (await import("jszip")).default;
		const tmpDir3 = join(tmpdir(), `fe-docx-empty-${Date.now()}`);
		await mkdir(tmpDir3, { recursive: true });

		const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
		const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p></w:p></w:body>
</w:document>`;

		const zip = new JSZip();
		zip.file("[Content_Types].xml", contentTypes);
		zip.file("word/document.xml", documentXml);
		const buf = await zip.generateAsync({ type: "nodebuffer" });

		const filepath = join(tmpDir3, "empty.docx");
		await writeFile(filepath, buf);

		const result = await extractDocx(filepath);
		expect(result).toBe("");

		await rm(tmpDir3, { recursive: true, force: true });
	});
});

describe("extractText", () => {
	let tmpDir: string;

	it("reads a plain UTF-8 text file and trims whitespace", async () => {
		tmpDir = join(tmpdir(), `fe-test-${Date.now()}`);
		await mkdir(tmpDir, { recursive: true });
		const filepath = join(tmpDir, "sample.txt");
		await writeFile(filepath, "  hello world\n", "utf-8");
		const result = await extractText(filepath);
		expect(result).toBe("hello world");
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("handles multi-line content", async () => {
		tmpDir = join(tmpdir(), `fe-test-${Date.now()}`);
		await mkdir(tmpDir, { recursive: true });
		const filepath = join(tmpDir, "multi.txt");
		await writeFile(filepath, "line 1\nline 2\nline 3", "utf-8");
		const result = await extractText(filepath);
		expect(result).toBe("line 1\nline 2\nline 3");
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("returns empty string for a file containing only whitespace", async () => {
		tmpDir = join(tmpdir(), `fe-test-${Date.now()}`);
		await mkdir(tmpDir, { recursive: true });
		const filepath = join(tmpDir, "blank.txt");
		await writeFile(filepath, "   \n\t  ", "utf-8");
		const result = await extractText(filepath);
		expect(result).toBe("");
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("preserves internal newlines", async () => {
		tmpDir = join(tmpdir(), `fe-test-${Date.now()}`);
		await mkdir(tmpDir, { recursive: true });
		const filepath = join(tmpDir, "newlines.txt");
		await writeFile(filepath, "a\n\nb\n\nc", "utf-8");
		const result = await extractText(filepath);
		expect(result).toBe("a\n\nb\n\nc");
		await rm(tmpDir, { recursive: true, force: true });
	});
});

// ── extractPptx (XML parsing logic) ──────────────────────────────────────────

describe("extractPptx", () => {
	let tmpDir: string;

	// Build a minimal valid .pptx zip (Office Open XML) with one slide
	// containing a text run. Uses JSZip via the same import path.
	it("extracts <a:t> text nodes from slide XML", async () => {
		const JSZip = (await import("jszip")).default;
		tmpDir = join(tmpdir(), `fe-pptx-${Date.now()}`);
		await mkdir(tmpDir, { recursive: true });

		const zip = new JSZip();
		const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody>
      <a:p><a:r><a:t>Hello World</a:t></a:r></a:p>
      <a:p><a:r><a:t>Second run</a:t></a:r></a:p>
    </p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;
		zip.file("ppt/slides/slide1.xml", slideXml);
		const buf = await zip.generateAsync({ type: "nodebuffer" });

		const filepath = join(tmpDir, "test.pptx");
		await writeFile(filepath, buf);

		const result = await extractPptx(filepath);
		expect(result).toContain("Hello World");
		expect(result).toContain("Second run");
		expect(result).toContain("Slide 1");

		await rm(tmpDir, { recursive: true, force: true });
	});

	it("unescapes HTML entities in text nodes", async () => {
		const JSZip = (await import("jszip")).default;
		tmpDir = join(tmpdir(), `fe-pptx-entities-${Date.now()}`);
		await mkdir(tmpDir, { recursive: true });

		const zip = new JSZip();
		const slideXml = `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>
    <a:p><a:r><a:t>A &amp; B &lt;test&gt; &quot;q&quot; &apos;s&apos;</a:t></a:r></a:p>
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;
		zip.file("ppt/slides/slide1.xml", slideXml);
		const buf = await zip.generateAsync({ type: "nodebuffer" });

		const filepath = join(tmpDir, "entities.pptx");
		await writeFile(filepath, buf);

		const result = await extractPptx(filepath);
		expect(result).toContain("A & B <test> \"q\" 's'");

		await rm(tmpDir, { recursive: true, force: true });
	});

	it("returns empty string for a pptx with no slides", async () => {
		const JSZip = (await import("jszip")).default;
		tmpDir = join(tmpdir(), `fe-pptx-empty-${Date.now()}`);
		await mkdir(tmpDir, { recursive: true });

		const zip = new JSZip();
		zip.file("ppt/presentation.xml", "<p:presentation/>");
		const buf = await zip.generateAsync({ type: "nodebuffer" });

		const filepath = join(tmpDir, "empty.pptx");
		await writeFile(filepath, buf);

		const result = await extractPptx(filepath);
		expect(result).toBe("");

		await rm(tmpDir, { recursive: true, force: true });
	});

	it("skips slides that contain no text runs", async () => {
		const JSZip = (await import("jszip")).default;
		const tmpDir4 = join(tmpdir(), `fe-pptx-notext-${Date.now()}`);
		await mkdir(tmpDir4, { recursive: true });

		const zip = new JSZip();
		// slide1 has text, slide2 has no <a:t> nodes
		const slide1 = `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>
    <a:p><a:r><a:t>Has text</a:t></a:r></a:p>
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;
		const slide2 = `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>
    <a:p></a:p>
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;
		zip.file("ppt/slides/slide1.xml", slide1);
		zip.file("ppt/slides/slide2.xml", slide2);
		const buf = await zip.generateAsync({ type: "nodebuffer" });

		const filepath = join(tmpDir4, "partial.pptx");
		await writeFile(filepath, buf);

		const result = await extractPptx(filepath);
		expect(result).toContain("Has text");
		expect(result).not.toContain("Slide 2");

		await rm(tmpDir4, { recursive: true, force: true });
	});

	it("orders slides numerically (slide2 before slide10)", async () => {
		const JSZip = (await import("jszip")).default;
		const tmpDirOrdered = join(tmpdir(), `fe-pptx-order-${Date.now()}`);
		await mkdir(tmpDirOrdered, { recursive: true });

		const zip = new JSZip();
		const makeSlide = (text: string) =>
			`<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>
    <a:p><a:r><a:t>${text}</a:t></a:r></a:p>
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;
		for (let i = 1; i <= 10; i++) {
			zip.file(`ppt/slides/slide${i}.xml`, makeSlide(`Slide ${i} content`));
		}
		const buf = await zip.generateAsync({ type: "nodebuffer" });

		const filepath = join(tmpDirOrdered, "ordered.pptx");
		await writeFile(filepath, buf);

		const result = await extractPptx(filepath);
		const idx2 = result.indexOf("Slide 2:");
		const idx10 = result.indexOf("Slide 10:");
		expect(idx2).toBeLessThan(idx10);

		await rm(tmpDirOrdered, { recursive: true, force: true });
	});
});
