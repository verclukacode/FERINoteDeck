import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "json-summary"],
			// Instrument every backend source file so the lcov report SonarCloud
			// reads carries line-level data for any file the new code might
			// touch (Sonar's "new lines covered" gate keys off lcov). Local
			// threshold checks are still applied only to lib files that are
			// fully testable without external services.
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/__tests__/**",
				"src/**/*.test.ts",
				"src/index.ts",
				"src/middleware/**",
				"src/types/**",
				"src/lib/prisma.ts",
				"src/lib/firebase.ts",
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
			},
		},
	},
});
