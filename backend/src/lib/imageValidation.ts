import fs from "node:fs/promises";

// Strict allowlist of raster image extensions. SVG is excluded on purpose: SVG
// can carry executable script and, when served by our static mount with
// `Content-Type: image/svg+xml`, executes in the backend's origin if a victim
// opens the URL directly (right-click → "Open image"). PDFs, HTML, ICO, etc.
// are likewise excluded.
export const ALLOWED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

// Recognise the file from its magic bytes. The client-supplied mimetype on a
// multipart upload is attacker-controlled, so the only reliable check is the
// actual file content.
export async function verifyImageMagicBytes(
	filepath: string,
): Promise<boolean> {
	let fd: Awaited<ReturnType<typeof fs.open>> | undefined;
	try {
		fd = await fs.open(filepath, "r");
		const buf = Buffer.alloc(16);
		await fd.read(buf, 0, 16, 0);
		// PNG: 89 50 4E 47 0D 0A 1A 0A
		if (
			buf[0] === 0x89 &&
			buf[1] === 0x50 &&
			buf[2] === 0x4e &&
			buf[3] === 0x47
		) {
			return true;
		}
		// JPEG: FF D8 FF
		if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
			return true;
		}
		// GIF: "GIF87a" or "GIF89a"
		const head6 = buf.subarray(0, 6).toString("ascii");
		if (head6 === "GIF87a" || head6 === "GIF89a") return true;
		// WEBP: "RIFF" .... "WEBP"
		if (
			buf.subarray(0, 4).toString("ascii") === "RIFF" &&
			buf.subarray(8, 12).toString("ascii") === "WEBP"
		) {
			return true;
		}
		return false;
	} catch {
		return false;
	} finally {
		await fd?.close();
	}
}

// Local image URL: presets shipped from the frontend, or a file we uploaded
// (every `/api/images/<uid>/<filename>` route was validated by us). Used to
// keep external trackers / web beacons out of public marketplace content and
// user-controlled avatar fields.
export function isAllowedImageUrl(url: string): boolean {
	if (typeof url !== "string") return false;
	if (url.startsWith("/avatars/")) return true;
	if (url.startsWith("/api/images/")) return true;
	return false;
}

// Pull every markdown image URL out of a note's content (the block editor
// stores image blocks as `![caption](url)`).
export function extractImageUrls(markdown: string): string[] {
	const urls: string[] = [];
	const re = /!\[[^\]]*\]\(([^)]+)\)/g;
	let m: RegExpExecArray | null = re.exec(markdown);
	while (m !== null) {
		urls.push(m[1]);
		m = re.exec(markdown);
	}
	return urls;
}
