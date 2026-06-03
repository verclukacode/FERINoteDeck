import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	ALLOWED_IMAGE_EXTS,
	extractImageUrls,
	isAllowedImageUrl,
	verifyImageMagicBytes,
	verifyImportMagicBytes,
} from "../imageValidation";

describe("ALLOWED_IMAGE_EXTS", () => {
	it("includes .png, .jpg, .jpeg, .gif, .webp", () => {
		expect(ALLOWED_IMAGE_EXTS).toEqual(
			expect.arrayContaining([".png", ".jpg", ".jpeg", ".gif", ".webp"]),
		);
	});

	it("does not include .svg (security: SVG can carry executable script)", () => {
		expect(ALLOWED_IMAGE_EXTS).not.toContain(".svg");
	});

	it("does not include .pdf or .html", () => {
		expect(ALLOWED_IMAGE_EXTS).not.toContain(".pdf");
		expect(ALLOWED_IMAGE_EXTS).not.toContain(".html");
	});
});

describe("isAllowedImageUrl", () => {
	it("allows /api/images/ paths (uploaded images)", () => {
		expect(isAllowedImageUrl("/api/images/abc123.png")).toBe(true);
		expect(isAllowedImageUrl("/api/images/")).toBe(true);
	});

	it("allows /avatars/ paths (preset avatars)", () => {
		expect(isAllowedImageUrl("/avatars/default.jpg")).toBe(true);
		expect(isAllowedImageUrl("/avatars/")).toBe(true);
	});

	it("rejects external URLs", () => {
		expect(isAllowedImageUrl("https://example.com/img.png")).toBe(false);
		expect(isAllowedImageUrl("http://evil.com/tracker.gif")).toBe(false);
	});

	it("rejects other internal paths not on the allowlist", () => {
		expect(isAllowedImageUrl("/uploads/foo.png")).toBe(false);
		expect(isAllowedImageUrl("/static/logo.png")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isAllowedImageUrl("")).toBe(false);
	});

	it("rejects non-string values (runtime safety)", () => {
		expect(isAllowedImageUrl(null as unknown as string)).toBe(false);
		expect(isAllowedImageUrl(undefined as unknown as string)).toBe(false);
		expect(isAllowedImageUrl(42 as unknown as string)).toBe(false);
	});
});

describe("extractImageUrls", () => {
	it("extracts a single image URL from markdown", () => {
		expect(extractImageUrls("![alt text](/api/images/photo.png)")).toEqual([
			"/api/images/photo.png",
		]);
	});

	it("extracts multiple image URLs in order", () => {
		const md = "![a](/api/images/one.jpg) some text ![b](/api/images/two.png)";
		expect(extractImageUrls(md)).toEqual([
			"/api/images/one.jpg",
			"/api/images/two.png",
		]);
	});

	it("returns empty array when no images are present", () => {
		expect(extractImageUrls("Just some plain text")).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		expect(extractImageUrls("")).toEqual([]);
	});

	it("handles image with empty alt text", () => {
		expect(extractImageUrls("![](/api/images/no-alt.png)")).toEqual([
			"/api/images/no-alt.png",
		]);
	});

	it("does not extract inline links (only image syntax)", () => {
		expect(extractImageUrls("[link text](https://example.com)")).toEqual([]);
	});

	it("extracts URL from an image block surrounded by other markdown", () => {
		const md =
			"# Heading\n\nSome paragraph.\n\n![screenshot](/api/images/s.webp)\n\nMore text.";
		expect(extractImageUrls(md)).toEqual(["/api/images/s.webp"]);
	});
});

// ── verifyImageMagicBytes ─────────────────────────────────────────────────────

async function withTmpFile(
	buf: Buffer,
	fn: (filepath: string) => Promise<void>,
) {
	const dir = join(tmpdir(), `iv-test-${Date.now()}-${Math.random()}`);
	await mkdir(dir, { recursive: true });
	const filepath = join(dir, "file");
	await writeFile(filepath, buf);
	try {
		await fn(filepath);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

describe("verifyImageMagicBytes", () => {
	it("accepts a valid PNG (magic: 89 50 4E 47 ...)", async () => {
		// Minimal 16-byte PNG header signature
		const png = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
			0x49, 0x48, 0x44, 0x52,
		]);
		await withTmpFile(png, async (fp) => {
			expect(await verifyImageMagicBytes(fp)).toBe(true);
		});
	});

	it("accepts a valid JPEG (magic: FF D8 FF ...)", async () => {
		const jpg = Buffer.from([
			0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
			0x00, 0x00, 0x00, 0x00,
		]);
		await withTmpFile(jpg, async (fp) => {
			expect(await verifyImageMagicBytes(fp)).toBe(true);
		});
	});

	it("accepts a valid GIF89a", async () => {
		const gif = Buffer.from(`GIF89a${"\x00".repeat(10)}`, "ascii");
		await withTmpFile(gif, async (fp) => {
			expect(await verifyImageMagicBytes(fp)).toBe(true);
		});
	});

	it("accepts a valid GIF87a", async () => {
		const gif = Buffer.from(`GIF87a${"\x00".repeat(10)}`, "ascii");
		await withTmpFile(gif, async (fp) => {
			expect(await verifyImageMagicBytes(fp)).toBe(true);
		});
	});

	it("accepts a valid WEBP (RIFF....WEBP)", async () => {
		const webp = Buffer.alloc(16);
		webp.write("RIFF", 0, "ascii");
		webp.writeUInt32LE(8, 4); // file size placeholder
		webp.write("WEBP", 8, "ascii");
		await withTmpFile(webp, async (fp) => {
			expect(await verifyImageMagicBytes(fp)).toBe(true);
		});
	});

	it("rejects a file with no matching signature", async () => {
		const random = Buffer.from([
			0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
			0x0c, 0x0d, 0x0e, 0x0f,
		]);
		await withTmpFile(random, async (fp) => {
			expect(await verifyImageMagicBytes(fp)).toBe(false);
		});
	});

	it("returns false for a non-existent file path", async () => {
		expect(await verifyImageMagicBytes("/tmp/does-not-exist-xyz.png")).toBe(
			false,
		);
	});
});

// ── verifyImportMagicBytes ────────────────────────────────────────────────────

describe("verifyImportMagicBytes", () => {
	it("accepts a valid PDF (%PDF- header)", async () => {
		const pdf = Buffer.from(`%PDF-1.4\n${"%\x00".repeat(10)}`, "ascii");
		await withTmpFile(pdf, async (fp) => {
			expect(await verifyImportMagicBytes(fp, "pdf")).toBe(true);
		});
	});

	it("rejects a non-PDF file for kind=pdf", async () => {
		const notPdf = Buffer.from("NOTPDF1234", "ascii");
		await withTmpFile(notPdf, async (fp) => {
			expect(await verifyImportMagicBytes(fp, "pdf")).toBe(false);
		});
	});

	it("accepts a valid zip (PK\\x03\\x04 header) for kind=zip", async () => {
		const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
		await withTmpFile(zip, async (fp) => {
			expect(await verifyImportMagicBytes(fp, "zip")).toBe(true);
		});
	});

	it("rejects a non-zip file for kind=zip", async () => {
		const notZip = Buffer.from([
			0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
		]);
		await withTmpFile(notZip, async (fp) => {
			expect(await verifyImportMagicBytes(fp, "zip")).toBe(false);
		});
	});

	it("delegates kind=image to verifyImageMagicBytes (PNG accepted)", async () => {
		const png = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
			0x49, 0x48, 0x44, 0x52,
		]);
		await withTmpFile(png, async (fp) => {
			expect(await verifyImportMagicBytes(fp, "image")).toBe(true);
		});
	});

	it("returns false for a non-existent file path", async () => {
		expect(await verifyImportMagicBytes("/tmp/no-such-file-xyz", "pdf")).toBe(
			false,
		);
	});
});
