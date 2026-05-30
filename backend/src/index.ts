import "dotenv/config";
import fs from "node:fs";
import cors from "cors";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import { MulterError } from "multer";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import "./lib/firebase";
import { requireAuth } from "./middleware/requireAuth";
import calendarEventsRouter from "./routes/calendar-events";
import calendarTagsRouter from "./routes/calendar-tags";
import cardsRouter from "./routes/cards";
import decksRouter from "./routes/decks";
import flashcardFoldersRouter from "./routes/flashcard-folders";
import foldersRouter from "./routes/folders";
import imagesRouter, { uploadsDir } from "./routes/images";
import invitesRouter from "./routes/invites";
import marketplaceRouter from "./routes/marketplace";
import pagesRouter from "./routes/pages";
import searchRouter from "./routes/search";
import usersRouter from "./routes/users";

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

fs.mkdirSync(uploadsDir, { recursive: true });

const swaggerSpec = swaggerJsdoc({
	definition: {
		openapi: "3.0.0",
		info: {
			title: "NoteDeck API",
			version: "1.0.0",
			description: "NoteDeck notes API — MySQL persistence, Firebase auth",
		},
		servers: [{ url: `http://localhost:${PORT}` }],
	},
	apis: ["./src/routes/*.ts"],
});

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => {
	res.json({ name: "NoteDeck API", status: "ok" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Uploaded images are served publicly — an <img> tag cannot send an auth
// header; filenames are unguessable UUIDs.
app.use("/api/images", express.static(uploadsDir));

app.use("/api/folders", requireAuth, foldersRouter);
app.use("/api/pages", requireAuth, pagesRouter);
app.use("/api/images", requireAuth, imagesRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/flashcard-folders", requireAuth, flashcardFoldersRouter);
app.use("/api/decks", requireAuth, decksRouter);
app.use("/api/cards", requireAuth, cardsRouter);
app.use("/api/invites", requireAuth, invitesRouter);
app.use("/api/marketplace", requireAuth, marketplaceRouter);
app.use("/api/search", requireAuth, searchRouter);
app.use("/api/calendar-tags", requireAuth, calendarTagsRouter);
app.use("/api/calendar-events", requireAuth, calendarEventsRouter);

// JSON error handler — Express 5 forwards async route rejections here.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
	if (err instanceof MulterError) {
		return res.status(400).json({ error: err.message });
	}
	console.error(err);
	res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
	console.log(`NoteDeck backend running on http://localhost:${PORT}`);
	console.log(`Swagger UI:          http://localhost:${PORT}/api-docs`);
});
