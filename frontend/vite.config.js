/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 5173,
		proxy: {
			"/api": "http://localhost:3001",
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.{js,jsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "json-summary"],
			include: [
				"src/features/notes/editor/markdown.js",
				"src/features/notes/editor/blockModel.js",
				"src/features/notes/editor/inlineFormat.js",
				"src/features/auth/firebaseError.js",
				"src/features/marketplace/marketplaceLink.js",
				"src/lib/constants.js",
				"src/lib/postAuthDest.js",
				"src/lib/id.js",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				statements: 80,
				branches: 70,
			},
		},
	},
});
