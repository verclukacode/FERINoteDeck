import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/__tests__/**",
				"src/**/*.test.ts",
				"src/index.ts",
				"src/middleware/**",
				"src/types/**",
				"src/lib/prisma.ts",
				"src/lib/firebase.ts",
				"src/lib/openai.ts",
				"src/lib/cloneDeck.ts",
				"src/lib/studySettings.ts",
				"src/routes/calendar-events.ts",
				"src/routes/calendar-tags.ts",
				"src/routes/cards.ts",
				"src/routes/deck-invites.ts",
				"src/routes/flashcard-folders.ts",
				"src/routes/folders.ts",
				"src/routes/images.ts",
				"src/routes/invites.ts",
				"src/routes/marketplace.ts",
			],
			thresholds: {
				"src/lib/srs.ts": {
					lines: 80,
					functions: 80,
					statements: 80,
					branches: 70,
				},
				"src/lib/serialize.ts": {
					lines: 80,
					functions: 80,
					statements: 80,
					branches: 70,
				},
				"src/lib/fileExtraction.ts": {
					lines: 80,
					functions: 80,
					statements: 80,
					branches: 70,
				},
				"src/lib/imageValidation.ts": {
					lines: 80,
					functions: 80,
					statements: 80,
					branches: 70,
				},
			},
		},
	},
});
