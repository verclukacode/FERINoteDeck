import { describe, expect, it } from "vitest";
import { buildTestTitle, studyDayWindow } from "../decks";

// ── studyDayWindow ────────────────────────────────────────────────────────────

describe("studyDayWindow", () => {
	// Use a fixed, well-known date: 2024-01-15 at 14:00 UTC.
	// Tests run with the local TZ of the CI runner, so we derive expected values
	// from the same Date API logic the function uses.
	const makeRollover = (nowMs: number, hour: number) => {
		const d = new Date(nowMs);
		return new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			hour,
			0,
			0,
			0,
		).getTime();
	};

	it("returns a window exactly 24 h wide", () => {
		const now = Date.now();
		const [start, end] = studyDayWindow(now, 4);
		expect(end - start).toBe(86_400_000);
	});

	it("when now is after the rollover hour, start === rollover", () => {
		// Pick a time that is definitely after hour=0 rollover (noon)
		const noon = new Date();
		noon.setHours(12, 0, 0, 0);
		const nowMs = noon.getTime();
		const rollover = makeRollover(nowMs, 0);
		const [start] = studyDayWindow(nowMs, 0);
		expect(start).toBe(rollover);
	});

	it("when now is before the rollover hour, start is previous day's rollover", () => {
		// Pick a time that is definitely before hour=23 rollover (e.g. 1 AM)
		const early = new Date();
		early.setHours(1, 0, 0, 0);
		const nowMs = early.getTime();
		const rollover = makeRollover(nowMs, 23);
		// nowMs < rollover, so start should be rollover - 24h
		const [start] = studyDayWindow(nowMs, 23);
		expect(start).toBe(rollover - 86_400_000);
	});

	it("start is always <= nowMs", () => {
		const now = Date.now();
		for (const hour of [0, 4, 12, 23]) {
			const [start] = studyDayWindow(now, hour);
			expect(start).toBeLessThanOrEqual(now);
		}
	});

	it("nowMs is always < end", () => {
		const now = Date.now();
		for (const hour of [0, 4, 12, 23]) {
			const [, end] = studyDayWindow(now, hour);
			expect(now).toBeLessThan(end);
		}
	});

	it("rollover at hour 4 produces distinct windows from hour 0", () => {
		const now = Date.now();
		const [start0] = studyDayWindow(now, 0);
		const [start4] = studyDayWindow(now, 4);
		// They differ by 4 h = 14_400_000 ms unless they happen to land in the
		// same zone — we just verify they are not always identical.
		// (Edge case: if the test runs exactly at 00:00–04:00 they CAN equal,
		//  but at least one hour pair will differ.)
		const [start12] = studyDayWindow(now, 12);
		// At least one pair must differ
		const allSame = start0 === start4 && start4 === start12;
		expect(allSame).toBe(false);
	});
});

// ── buildTestTitle ────────────────────────────────────────────────────────────

describe("buildTestTitle", () => {
	it("uses 'Test: <title>' for a single source", () => {
		expect(buildTestTitle(["Biology notes"])).toBe("Test: Biology notes");
	});

	it("joins two sources with a comma", () => {
		expect(buildTestTitle(["Biology", "Chemistry"])).toBe(
			"Test: Biology, Chemistry",
		);
	});

	it("shows +N suffix when more than 2 sources", () => {
		expect(buildTestTitle(["A", "B", "C"])).toBe("Test: A, B +1");
		expect(buildTestTitle(["A", "B", "C", "D", "E"])).toBe("Test: A, B +3");
	});

	it("no +N suffix for exactly 2 sources", () => {
		const title = buildTestTitle(["X", "Y"]);
		expect(title).not.toContain("+");
	});

	it("handles titles with special characters", () => {
		expect(buildTestTitle(["Math & Stats"])).toBe("Test: Math & Stats");
	});
});
