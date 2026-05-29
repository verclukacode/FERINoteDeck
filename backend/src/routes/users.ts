import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { type Request, type Response, Router } from "express";
import multer from "multer";
import {
	ALLOWED_IMAGE_EXTS,
	isAllowedImageUrl,
	verifyImageMagicBytes,
} from "../lib/imageValidation";
import { prisma } from "../lib/prisma";
import { getOrCreateStudySettings } from "../lib/studySettings";
import { uploadsDir } from "./images";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// Same rationale as routes/images.ts: SVG and other non-raster types are out
// (SVG can carry script, polyglot files defeat the mimetype check).
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
		const ext = path.extname(file.originalname).toLowerCase();
		const safeExt = ALLOWED_IMAGE_EXTS.includes(ext) ? ext : ".png";
		cb(null, `avatar-${crypto.randomUUID()}${safeExt}`);
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

const router = Router();

router.get("/me", async (req: Request, res: Response) => {
	const user = await prisma.user.findUnique({
		where: { id: req.user?.uid ?? "" },
		select: { id: true, email: true, username: true, avatarUrl: true },
	});
	res.json(user);
});

router.patch("/me", async (req: Request, res: Response) => {
	const { avatarUrl, username } = req.body as {
		avatarUrl?: string | null;
		username?: string;
	};
	const data: { avatarUrl?: string | null; username?: string } = {};

	if ("avatarUrl" in req.body) {
		// Reject arbitrary external URLs — a user could otherwise set their
		// avatar to e.g. https://attacker.com/track.gif and every marketplace
		// viewer leaks their IP / user-agent to that server.
		if (avatarUrl != null && !isAllowedImageUrl(avatarUrl)) {
			return res
				.status(400)
				.json({ error: "avatarUrl must be a preset or an uploaded image" });
		}
		data.avatarUrl = avatarUrl ?? null;
	}

	if (username !== undefined) {
		if (!USERNAME_RE.test(username)) {
			return res.status(400).json({ error: "Invalid username format." });
		}
		const taken = await prisma.user.findFirst({
			where: { username: username.toLowerCase(), NOT: { id: req.user?.uid } },
		});
		if (taken)
			return res.status(409).json({ error: "Username already taken." });
		data.username = username.toLowerCase();
	}

	const user = await prisma.user.update({
		where: { id: req.user?.uid ?? "" },
		data,
		select: { id: true, email: true, username: true, avatarUrl: true },
	});
	res.json(user);
});

router.get("/check-username/:username", async (req: Request, res: Response) => {
	const username = String(req.params.username);
	if (!USERNAME_RE.test(username)) {
		return res.json({
			available: false,
			error: "3–20 characters, letters, numbers, underscores only.",
		});
	}
	const taken = await prisma.user.findFirst({
		where: { username: username.toLowerCase(), NOT: { id: req.user?.uid } },
	});
	res.json({ available: !taken });
});

// --- Study settings (Anki-style defaults, profile-wide) ---

const INT_SETTING_LIMITS: Record<string, { min: number; max: number }> = {
	newCardsPerDay: { min: 0, max: 9999 },
	maxReviewsPerDay: { min: 0, max: 99999 },
	graduatingIntervalDays: { min: 1, max: 36500 },
	easyIntervalDays: { min: 1, max: 36500 },
	startingEase: { min: 1300, max: 5000 },
	easyBonusPermille: { min: 1000, max: 5000 },
	hardMultiplierPermille: { min: 1000, max: 5000 },
	intervalModifierPermille: { min: 100, max: 5000 },
	maxIntervalDays: { min: 1, max: 36500 },
	newDayStartsAtHour: { min: 0, max: 23 },
};

/**
 * @openapi
 * /api/users/me/study-settings:
 *   get:
 *     summary: Get the user's study settings (created with defaults on first read)
 *     tags: [Users]
 *     responses:
 *       200: { description: The study settings }
 */
router.get("/me/study-settings", async (req: Request, res: Response) => {
	const settings = await getOrCreateStudySettings(req.user?.uid ?? "");
	res.json(settings);
});

/**
 * @openapi
 * /api/users/me/study-settings:
 *   patch:
 *     summary: Update the user's study settings (SM-2 defaults)
 *     tags: [Users]
 *     responses:
 *       200: { description: The updated settings }
 *       400: { description: Invalid setting value }
 */
router.patch("/me/study-settings", async (req: Request, res: Response) => {
	const body = req.body as Record<string, unknown>;
	const data: Record<string, number | number[]> = {};

	for (const [key, limits] of Object.entries(INT_SETTING_LIMITS)) {
		if (key in body) {
			const n = Number(body[key]);
			if (!Number.isInteger(n) || n < limits.min || n > limits.max) {
				return res.status(400).json({ error: `Invalid ${key}` });
			}
			data[key] = n;
		}
	}

	for (const key of ["learningStepsSec", "relearningStepsSec"]) {
		if (key in body) {
			const arr = body[key];
			if (
				!Array.isArray(arr) ||
				arr.length === 0 ||
				!arr.every((v) => Number.isInteger(v) && (v as number) > 0)
			) {
				return res.status(400).json({
					error: `${key} must be a non-empty array of positive integers (seconds)`,
				});
			}
			data[key] = arr as number[];
		}
	}

	const userId = req.user?.uid ?? "";
	const settings = await prisma.studySettings.upsert({
		where: { userId },
		create: { userId, ...data },
		update: data,
	});
	res.json(settings);
});

router.post(
	"/me/avatar",
	upload.single("avatar"),
	async (req: Request, res: Response) => {
		if (!req.file) {
			return res
				.status(400)
				.json({ error: "No image uploaded (only PNG, JPEG, GIF, WEBP)" });
		}
		const ok = await verifyImageMagicBytes(req.file.path);
		if (!ok) {
			await fsp.unlink(req.file.path).catch(() => {});
			return res.status(400).json({ error: "File is not a valid image" });
		}
		const avatarUrl = `/api/images/${req.user?.uid ?? ""}/${req.file.filename}`;
		const user = await prisma.user.update({
			where: { id: req.user?.uid ?? "" },
			data: { avatarUrl },
			select: { id: true, email: true, username: true, avatarUrl: true },
		});
		res.json(user);
	},
);

export default router;
