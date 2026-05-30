import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { type Request, type Response, Router } from "express";
import multer from "multer";
import {
	ALLOWED_IMAGE_EXTS,
	verifyImageMagicBytes,
} from "../lib/imageValidation";

// Uploaded image files live here (gitignored), one subfolder per user.
export const uploadsDir = path.join(__dirname, "../../uploads");

// SVG / unknown mimetypes are rejected here AND the saved file is later
// verified by magic bytes — see verifyImageMagicBytes.
const ALLOWED_MIMETYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
]);

const storage = multer.diskStorage({
	destination: (req, _file, cb) => {
		const dir = path.join(uploadsDir, req.user?.uid ?? "");
		fs.mkdirSync(dir, { recursive: true });
		cb(null, dir);
	},
	filename: (_req, file, cb) => {
		// Pin to the allowed extension that matches the mimetype the upload
		// claims; we re-verify by magic bytes in the route handler.
		const ext = path.extname(file.originalname).toLowerCase();
		const safeExt = ALLOWED_IMAGE_EXTS.includes(ext) ? ext : ".png";
		cb(null, `${crypto.randomUUID()}${safeExt}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
			cb(null, false);
			return;
		}
		cb(null, true);
	},
});

/**
 * @openapi
 * /api/images:
 *   post:
 *     summary: Upload an image (PNG/JPEG/GIF/WEBP only); returns a URL to embed in note markdown
 *     tags: [Images]
 *     responses:
 *       201: { description: "{ url } of the stored image" }
 *       400: { description: No or invalid image }
 */
const router = Router();

router.post(
	"/",
	upload.single("image"),
	async (req: Request, res: Response) => {
		if (!req.file) {
			return res
				.status(400)
				.json({ error: "No image uploaded (only PNG, JPEG, GIF, WEBP)" });
		}
		// Verify the *contents* are actually a raster image. Multer trusts the
		// client-supplied mimetype, which an attacker controls. Magic bytes don't lie.
		const ok = await verifyImageMagicBytes(req.file.path);
		if (!ok) {
			await fsp.unlink(req.file.path).catch(() => {});
			return res.status(400).json({ error: "File is not a valid image" });
		}
		res.status(201).json({
			url: `/api/images/${req.user?.uid ?? ""}/${req.file.filename}`,
		});
	},
);

export default router;
