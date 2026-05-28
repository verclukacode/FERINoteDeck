import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../lib/firebase";
import { prisma } from "../lib/prisma";

// Verifies the Firebase ID token, upserts the User row (FK target for
// folders/pages), and attaches req.user.
export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const header = req.headers.authorization ?? "";
	const token = header.startsWith("Bearer ") ? header.slice(7) : null;
	if (!token) {
		return res.status(401).json({ error: "Missing auth token" });
	}
	try {
		const decoded = await firebaseAuth.verifyIdToken(token);
		const uid = decoded.uid;
		const email = decoded.email ?? "";
		await prisma.user.upsert({
			where: { id: uid },
			create: { id: uid, email },
			update: { email },
		});
		req.user = { uid, email };
		next();
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[requireAuth] FAILED:", msg);
		res.status(401).json({ error: "Invalid auth token" });
	}
}
