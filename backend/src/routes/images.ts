import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type Request, type Response, Router } from "express";
import multer from "multer";

// Uploaded image files live here (gitignored), one subfolder per user.
export const uploadsDir = path.join(__dirname, "../../uploads");

const storage = multer.diskStorage({
	destination: (req, _file, cb) => {
		const dir = path.join(uploadsDir, req.user?.uid ?? "");
		fs.mkdirSync(dir, { recursive: true });
		cb(null, dir);
	},
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase() || ".png";
		cb(null, `${crypto.randomUUID()}${ext}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

/**
 * @openapi
 * /api/images:
 *   post:
 *     summary: Upload an image; returns a URL to embed in note markdown
 *     tags: [Images]
 *     responses:
 *       201: { description: "{ url } of the stored image" }
 *       400: { description: No or invalid image }
 */
const router = Router();

router.post("/", upload.single("image"), (req: Request, res: Response) => {
	if (!req.file) {
		return res.status(400).json({ error: "No image uploaded" });
	}
	res.status(201).json({
		url: `/api/images/${req.user?.uid ?? ""}/${req.file.filename}`,
	});
});

export default router;
