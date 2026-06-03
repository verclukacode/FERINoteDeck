import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { type Request, type Response, Router } from "express";
import multer from "multer";
import {
	type ExtractedFile,
	extractDocx,
	extractPdf,
	extractPptx,
	extractText,
	kindFromExtension,
} from "../lib/fileExtraction";
import {
	ALLOWED_IMAGE_EXTS,
	verifyImportMagicBytes,
} from "../lib/imageValidation";
import { generateNoteFromFiles } from "../lib/openai";
import { prisma } from "../lib/prisma";
import { uploadsDir } from "./images";

const PROMPT_MAX = 1500;
const FILE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
const TOTAL_MAX_BYTES = 20 * 1024 * 1024; // 20 MB per request

const ALLOWED_EXTS = [
	".pdf",
	".docx",
	".pptx",
	".txt",
	".md",
	...ALLOWED_IMAGE_EXTS,
];
const ALLOWED_MIMETYPES = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"text/plain",
	"text/markdown",
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
]);

// Temp dir for non-image uploads (deleted after extraction). Images are moved
// into the existing per-user folder under `uploads/<uid>/` and kept.
const tempDir = path.join(uploadsDir, "_import_temp");

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		fs.mkdirSync(tempDir, { recursive: true });
		cb(null, tempDir);
	},
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const safeExt = ALLOWED_EXTS.includes(ext) ? ext : ".bin";
		cb(null, `${crypto.randomUUID()}${safeExt}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: FILE_MAX_BYTES },
	fileFilter: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		if (!ALLOWED_EXTS.includes(ext)) {
			cb(null, false);
			return;
		}
		if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
			cb(null, false);
			return;
		}
		cb(null, true);
	},
});

export const NO_API_SUFFIX = "(no-api)";
// Lowest tier — gets everything except AI import.
const BASIC_TIER = "basic";

// Dummy note that exercises every supported block type, populated with the
// real filenames + image URLs the user uploaded so the test feels grounded.
export function buildDummyNote(extracted: ExtractedFile[]): {
	title: string;
	content: string;
} {
	const imageFiles = extracted.filter((f) => f.kind === "image" && f.imageUrl);
	const textFiles = extracted.filter((f) => f.kind !== "image");
	const lines: string[] = [
		"# Magical Import — Dummy Note",
		"",
		"This note was generated in **no-api** mode to exercise every block",
		"type the editor accepts. No OpenAI tokens were used to make it.",
		"",
		"## What you uploaded",
	];
	if (textFiles.length) {
		lines.push("Text-bearing files we read:");
		for (const f of textFiles) lines.push(`- ${f.filename}`);
	} else {
		lines.push("No text files this time.");
	}
	if (imageFiles.length) {
		lines.push("");
		lines.push("Images attached:");
		let i = 1;
		for (const f of imageFiles) lines.push(`${i++}. ${f.filename}`);
	}
	lines.push("");
	lines.push("## Things to try next");
	lines.push("- [x] Open the modal and start a real import");
	lines.push("- [ ] Pick a folder for this dummy note");
	lines.push("- [ ] Notice the magical loader animation");
	for (const f of imageFiles) {
		if (!f.imageUrl) continue;
		lines.push("");
		lines.push(`![Preview of ${f.filename}](${f.imageUrl})`);
	}
	lines.push("");
	lines.push("---");
	lines.push("");
	lines.push("## Closing thought");
	lines.push(
		"If you're seeing this, the upload pipeline, file extraction, and the",
		"editor's markdown parser are all in working order. Swap your password",
		`back to plain (drop the "${NO_API_SUFFIX}" suffix) to hit the real model.`,
	);
	const content = `<<<NoteDeckMD>>>\n${lines.join("\n")}\n<<<NoteDeckMD>>>`;
	return { title: "Magical Import — Dummy Note", content };
}

/**
 * @openapi
 * /api/import:
 *   post:
 *     summary: Upload files + prompt; generate a NoteDeck markdown note via OpenAI
 *     tags: [Import]
 *     responses:
 *       200: { description: "{ title, content } — not saved yet, awaiting folder pick" }
 *       400: { description: Bad request (file/mimetype/size/prompt) }
 *       401: { description: Invalid AI password }
 *       503: { description: AI import not configured }
 */
const router = Router();

router.post(
	"/",
	upload.array("files", 20),
	async (req: Request, res: Response) => {
		const apiKey = process.env.OPENAI_API_KEY;
		const files = (req.files as Express.Multer.File[] | undefined) ?? [];

		// Cleanup helper — runs on every exit path that's not a kept-image.
		const tempPaths = files.map((f) => f.path);
		async function deleteTemp() {
			await Promise.all(tempPaths.map((p) => fsp.unlink(p).catch(() => {})));
		}

		try {
			if (!apiKey) {
				await deleteTemp();
				return res
					.status(503)
					.json({ error: "AI import not configured on this server" });
			}
			// Tier gate — only non-basic accounts have AI import.
			const account = await prisma.user.findUnique({
				where: { id: req.user?.uid ?? "" },
				select: { tier: true },
			});
			if (!account || account.tier === BASIC_TIER) {
				await deleteTemp();
				return res.status(403).json({
					error: "AI import requires a Pro or Premium account",
				});
			}

			// Debug short-circuit: prompt ending with "(no-api)" skips the OpenAI
			// call and returns a curated dummy note so we can iterate on the
			// animation + UI without burning credits. Only available to non-basic
			// users, since the tier gate is already checked above.
			const rawPrompt = String(req.body?.prompt ?? "");
			const isNoApi = rawPrompt.trimEnd().endsWith(NO_API_SUFFIX);
			const prompt = isNoApi
				? rawPrompt.trimEnd().slice(0, -NO_API_SUFFIX.length).trimEnd()
				: rawPrompt;
			if (prompt.length > PROMPT_MAX) {
				await deleteTemp();
				return res
					.status(400)
					.json({ error: `Prompt exceeds ${PROMPT_MAX} characters` });
			}
			if (!files.length) {
				await deleteTemp();
				return res.status(400).json({ error: "No files uploaded" });
			}

			const totalBytes = files.reduce((s, f) => s + f.size, 0);
			if (totalBytes > TOTAL_MAX_BYTES) {
				await deleteTemp();
				return res.status(400).json({
					error: `Total upload exceeds ${Math.round(TOTAL_MAX_BYTES / 1024 / 1024)} MB`,
				});
			}

			// Verify each file's magic bytes — multer trusts the client's mimetype,
			// which an attacker controls.
			const uid = req.user?.uid ?? "";
			const extracted: ExtractedFile[] = [];
			const keptImagePaths: string[] = [];

			for (const file of files) {
				const ext = path.extname(file.filename).toLowerCase();
				const kind = kindFromExtension(ext);
				if (!kind) {
					await deleteTemp();
					return res
						.status(400)
						.json({ error: `Unsupported file type: ${file.originalname}` });
				}

				const magic =
					kind === "pdf"
						? "pdf"
						: kind === "docx" || kind === "pptx"
							? "zip"
							: kind === "image"
								? "image"
								: null;
				if (magic) {
					const ok = await verifyImportMagicBytes(file.path, magic);
					if (!ok) {
						await deleteTemp();
						return res.status(400).json({
							error: `File content does not match its extension: ${file.originalname}`,
						});
					}
				}

				try {
					if (kind === "pdf") {
						const text = await extractPdf(file.path);
						extracted.push({
							kind,
							filename: file.originalname,
							text,
						});
					} else if (kind === "docx") {
						const text = await extractDocx(file.path);
						extracted.push({
							kind,
							filename: file.originalname,
							text,
						});
					} else if (kind === "pptx") {
						const text = await extractPptx(file.path);
						extracted.push({
							kind,
							filename: file.originalname,
							text,
						});
					} else if (kind === "text") {
						const text = await extractText(file.path);
						extracted.push({
							kind,
							filename: file.originalname,
							text,
						});
					} else if (kind === "image") {
						// Move into the per-user images folder so it becomes a first-class
						// upload reachable via /api/images/<uid>/<filename>.
						const userDir = path.join(uploadsDir, uid);
						fs.mkdirSync(userDir, { recursive: true });
						const target = path.join(userDir, file.filename);
						await fsp.rename(file.path, target);
						keptImagePaths.push(target);
						extracted.push({
							kind,
							filename: file.originalname,
							text: "",
							imageUrl: `/api/images/${uid}/${file.filename}`,
							imagePath: target,
						});
					}
				} catch (err) {
					console.error("File extraction failed", file.originalname, err);
					await deleteTemp();
					await Promise.all(
						keptImagePaths.map((p) => fsp.unlink(p).catch(() => {})),
					);
					return res.status(400).json({
						error: `Failed to read ${file.originalname}`,
					});
				}
			}

			// Delete every non-image temp file (image files were moved, not present here).
			const remaining = tempPaths.filter((p) => fs.existsSync(p));
			await Promise.all(remaining.map((p) => fsp.unlink(p).catch(() => {})));

			if (isNoApi) {
				// Let the magical loader animation play for a bit before resolving.
				await new Promise((r) => setTimeout(r, 15000));
				res.json(buildDummyNote(extracted));
				return;
			}

			const note = await generateNoteFromFiles(prompt, extracted);
			res.json(note);
		} catch (err) {
			console.error("Import failed", err);
			await deleteTemp();
			res.status(500).json({ error: "Import failed" });
		}
	},
);

export default router;
