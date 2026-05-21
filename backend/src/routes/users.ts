import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type Request, type Response, Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { uploadsDir } from "./images";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const storage = multer.diskStorage({
	destination: (req, _file, cb) => {
		const dir = path.join(uploadsDir, req.user?.uid ?? "");
		fs.mkdirSync(dir, { recursive: true });
		cb(null, dir);
	},
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase() || ".png";
		cb(null, `avatar-${crypto.randomUUID()}${ext}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
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
	const { avatarUrl, username } = req.body as { avatarUrl?: string | null; username?: string };
	const data: { avatarUrl?: string | null; username?: string } = {};

	if ("avatarUrl" in req.body) data.avatarUrl = avatarUrl ?? null;

	if (username !== undefined) {
		if (!USERNAME_RE.test(username)) {
			return res.status(400).json({ error: "Invalid username format." });
		}
		const taken = await prisma.user.findFirst({
			where: { username: username.toLowerCase(), NOT: { id: req.user?.uid } },
		});
		if (taken) return res.status(409).json({ error: "Username already taken." });
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
	const { username } = req.params;
	if (!USERNAME_RE.test(username)) {
		return res.json({ available: false, error: "3–20 characters, letters, numbers, underscores only." });
	}
	const taken = await prisma.user.findFirst({
		where: { username: username.toLowerCase(), NOT: { id: req.user?.uid } },
	});
	res.json({ available: !taken });
});

router.post("/me/avatar", upload.single("avatar"), async (req: Request, res: Response) => {
	if (!req.file) {
		return res.status(400).json({ error: "No image uploaded" });
	}
	const avatarUrl = `/api/images/${req.user?.uid ?? ""}/${req.file.filename}`;
	const user = await prisma.user.update({
		where: { id: req.user?.uid ?? "" },
		data: { avatarUrl },
		select: { id: true, email: true, username: true, avatarUrl: true },
	});
	res.json(user);
});

export default router;
