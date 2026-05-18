import bcrypt from "bcryptjs";
import { type Request, type Response, Router } from "express";
import jwt from "jsonwebtoken";

interface User {
	id: number;
	email: string;
	passwordHash: string;
}

const router = Router();
const users: User[] = [];
let nextId = 1;

const JWT_SECRET = process.env.JWT_SECRET ?? "notedeck-dev-secret-change-in-prod";

function sign(user: User) {
	return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registered successfully, returns JWT token
 *       400:
 *         description: Validation error or email already in use
 */
router.post("/register", async (req: Request, res: Response) => {
	const { email, password } = req.body as { email?: string; password?: string };
	if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
	if (users.find((u) => u.email === email)) return res.status(400).json({ error: "Email already in use" });
	const passwordHash = await bcrypt.hash(password, 10);
	const user: User = { id: nextId++, email, passwordHash };
	users.push(user);
	res.status(201).json({ token: sign(user), user: { id: user.id, email: user.email } });
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully, returns JWT token
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", async (req: Request, res: Response) => {
	const { email, password } = req.body as { email?: string; password?: string };
	if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
	const user = users.find((u) => u.email === email);
	if (!user) return res.status(401).json({ error: "Invalid credentials" });
	const valid = await bcrypt.compare(password, user.passwordHash);
	if (!valid) return res.status(401).json({ error: "Invalid credentials" });
	res.json({ token: sign(user), user: { id: user.id, email: user.email } });
});

export default router;
