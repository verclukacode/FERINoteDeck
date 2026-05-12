import "dotenv/config";
import cors from "cors";
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import notesRouter from "./routes/notes";

const app = express();
const PORT = process.env.PORT || 3000;

const swaggerSpec = swaggerJsdoc({
	definition: {
		openapi: "3.0.0",
		info: {
			title: "NoteDeck API",
			version: "1.0.0",
			description: "Simple in-memory notes REST API",
		},
		servers: [{ url: `http://localhost:${PORT}` }],
	},
	apis: ["./src/routes/*.ts"],
});

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
	res.json({ name: "NoteDeck API", status: "ok" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/notes", notesRouter);

app.listen(PORT, () => {
	console.log(`NoteDeck backend running on http://localhost:${PORT}`);
	console.log(`Swagger UI:          http://localhost:${PORT}/api-docs`);
});
