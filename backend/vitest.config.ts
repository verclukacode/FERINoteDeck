import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "json-summary"],
			// Only enforce thresholds against the pure, fully testable lib files.
			// Route files and DB-dependent code are excluded from the gate.
			include: ["src/lib/srs.ts", "src/lib/serialize.ts"],
			thresholds: {
				lines: 80,
				functions: 80,
				statements: 80,
				branches: 70,
			},
		},
	},
});
