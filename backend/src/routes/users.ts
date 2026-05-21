import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type Request, type Response, Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { uploadsDir } from "./images";

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
		select: { id: true, email: true, avatarUrl: true },
	});
	res.json(user);
});

router.patch("/me", async (req: Request, res: Response) => {
	const { avatarUrl } = req.body as { avatarUrl?: string };
	const user = await prisma.user.update({
		where: { id: req.user?.uid ?? "" },
		data: { avatarUrl: avatarUrl ?? null },
		select: { id: true, email: true, avatarUrl: true },
	});
	res.json(user);
});

router.post("/me/avatar", upload.single("avatar"), async (req: Request, res: Response) => {
	if (!req.file) {
		return res.status(400).json({ error: "No image uploaded" });
	}
	const avatarUrl = `/api/images/${req.user?.uid ?? ""}/${req.file.filename}`;
	const user = await prisma.user.update({
		where: { id: req.user?.uid ?? "" },
		data: { avatarUrl },
		select: { id: true, email: true, avatarUrl: true },
	});
	res.json(user);
});

export default router;
