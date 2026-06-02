import fs from "node:fs/promises";
import JSZip from "jszip";
import mammoth from "mammoth";

// pdf-parse 2.x is ESM-only — load it via dynamic import so the CommonJS
// backend build doesn't blow up at runtime with ERR_REQUIRE_ESM.
async function loadPdfParse() {
	const mod = await import("pdf-parse");
	return mod.PDFParse;
}

export type ImportFileKind = "pdf" | "docx" | "pptx" | "text" | "image";

export type ExtractedFile = {
	kind: ImportFileKind;
	filename: string;
	text: string; // empty for images
	imageUrl?: string; // set for images (public URL under /api/images/...)
	imagePath?: string; // set for images (absolute disk path — read for Vision base64)
};

const EXT_TO_KIND: Record<string, ImportFileKind> = {
	".pdf": "pdf",
	".docx": "docx",
	".pptx": "pptx",
	".txt": "text",
	".md": "text",
	".png": "image",
	".jpg": "image",
	".jpeg": "image",
	".gif": "image",
	".webp": "image",
};

export function kindFromExtension(ext: string): ImportFileKind | null {
	return EXT_TO_KIND[ext.toLowerCase()] ?? null;
}

export async function extractPdf(filepath: string): Promise<string> {
	const buf = await fs.readFile(filepath);
	const PDFParse = await loadPdfParse();
	const parser = new PDFParse({ data: new Uint8Array(buf) });
	try {
		const result = await parser.getText();
		return (result.text ?? "").trim();
	} finally {
		await parser.destroy().catch(() => {});
	}
}

export async function extractDocx(filepath: string): Promise<string> {
	const buf = await fs.readFile(filepath);
	const { value } = await mammoth.extractRawText({ buffer: buf });
	return value.trim();
}

// Read text from each ppt/slides/slideN.xml inside the .pptx zip. We only pull
// <a:t> nodes (the runs that hold visible characters) — layout is lost, but
// the words are preserved in slide order. Good enough for class material.
export async function extractPptx(filepath: string): Promise<string> {
	const buf = await fs.readFile(filepath);
	const zip = await JSZip.loadAsync(buf);
	const slideFiles = Object.keys(zip.files)
		.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
		.sort((a, b) => {
			const ai = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
			const bi = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
			return ai - bi;
		});

	const slideText: string[] = [];
	for (let i = 0; i < slideFiles.length; i++) {
		const xml = await zip.files[slideFiles[i]].async("string");
		const runs: string[] = [];
		const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
		let m = re.exec(xml);
		while (m !== null) {
			runs.push(
				m[1]
					.replace(/&amp;/g, "&")
					.replace(/&lt;/g, "<")
					.replace(/&gt;/g, ">")
					.replace(/&quot;/g, '"')
					.replace(/&apos;/g, "'"),
			);
			m = re.exec(xml);
		}
		if (runs.length) slideText.push(`Slide ${i + 1}: ${runs.join(" ")}`);
	}
	return slideText.join("\n\n");
}

export async function extractText(filepath: string): Promise<string> {
	const buf = await fs.readFile(filepath);
	// UTF-8 with fatal=true would throw on invalid bytes — we tolerate replacement
	// chars since binary-disguised-as-text would have been caught by the
	// extension check upstream.
	return buf.toString("utf-8").trim();
}
