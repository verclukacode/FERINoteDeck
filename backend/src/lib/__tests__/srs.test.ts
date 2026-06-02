import { describe, expect, it } from "vitest";
import {
	type CardState,
	type SchedulerSettings,
	schedule,
	settingsToScheduler,
} from "../srs";

// Deterministic "now" — avoids flakiness from real time.
const NOW = 1_700_000_000_000; // ms

const DEFAULT_SETTINGS: SchedulerSettings = {
	learningStepsSec: [60, 600], // 1 min, 10 min
	relearningStepsSec: [600], // 10 min
	graduatingIntervalDays: 1,
	easyIntervalDays: 4,
	startingEase: 2500,
	easyBonusPermille: 1300,
	hardMultiplierPermille: 1200,
	intervalModifierPermille: 1000,
	maxIntervalDays: 36500,
};

function newCard() {
	return {
		state: "new" as CardState,
		intervalSec: 0,
		ease: 0,
		reps: 0,
		lapses: 0,
		learningStep: 0,
	};
}

function learningCard(step = 0) {
	return {
		state: "learning" as CardState,
		intervalSec: DEFAULT_SETTINGS.learningStepsSec[step],
		ease: DEFAULT_SETTINGS.startingEase,
		reps: 0,
		lapses: 0,
		learningStep: step,
	};
}

function reviewCard(intervalSec = 86400, ease = 2500, reps = 5) {
	return {
		state: "review" as CardState,
		intervalSec,
		ease,
		reps,
		lapses: 0,
		learningStep: 0,
	};
}

describe("schedule — new card", () => {
	it("grade 1 (Again): enters learning, step 0, adopts startingEase", () => {
		const result = schedule(newCard(), 1, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("learning");
		expect(result.learningStep).toBe(0);
		expect(result.intervalSec).toBe(60);
		expect(result.ease).toBe(2500);
		expect(result.reps).toBe(0);
		expect(result.lapses).toBe(0);
		expect(result.due).toBe(NOW + 60 * 1000);
	});

	it("grade 2 (Hard): stays at step 0", () => {
		const result = schedule(newCard(), 2, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("learning");
		expect(result.learningStep).toBe(0);
		expect(result.intervalSec).toBe(60);
		expect(result.due).toBe(NOW + 60 * 1000);
	});

	it("grade 3 (Good): advances to step 1", () => {
		const result = schedule(newCard(), 3, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("learning");
		expect(result.learningStep).toBe(1);
		expect(result.intervalSec).toBe(600);
		expect(result.due).toBe(NOW + 600 * 1000);
	});

	it("grade 4 (Easy): graduates straight to review with easyIntervalDays", () => {
		const result = schedule(newCard(), 4, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("review");
		expect(result.reps).toBe(1);
		expect(result.intervalSec).toBe(4 * 86400); // 4 days in seconds
		expect(result.due).toBe(NOW + 4 * 86400 * 1000);
	});
});

describe("schedule — learning card", () => {
	it("grade 1 (Again): resets to step 0", () => {
		const result = schedule(learningCard(1), 1, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("learning");
		expect(result.learningStep).toBe(0);
		expect(result.intervalSec).toBe(60);
	});

	it("grade 3 (Good) at last step: graduates to review", () => {
		// learningCard(1) is at step 1, which is the last step (2 total)
		const result = schedule(learningCard(1), 3, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("review");
		expect(result.reps).toBe(1);
		expect(result.lapses).toBe(0);
	});

	it("grade 4 (Easy) from any learning step: graduates immediately", () => {
		const result = schedule(learningCard(0), 4, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("review");
		expect(result.reps).toBe(1);
	});
});

describe("schedule — relearning card", () => {
	it("grade 1 (Again): stays in relearning at step 0", () => {
		const card = {
			state: "relearning" as CardState,
			intervalSec: 600,
			ease: 2000,
			reps: 3,
			lapses: 1,
			learningStep: 0,
		};
		const result = schedule(card, 1, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("relearning");
		expect(result.learningStep).toBe(0);
		expect(result.intervalSec).toBe(600);
	});

	it("grade 3 (Good) at last relearning step: graduates to review", () => {
		const card = {
			state: "relearning" as CardState,
			intervalSec: 600,
			ease: 2000,
			reps: 3,
			lapses: 1,
			learningStep: 0, // only one relearning step
		};
		const result = schedule(card, 3, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("review");
		expect(result.lapses).toBe(1); // lapses preserved
	});
});

describe("schedule — review card", () => {
	it("grade 1 (Again): lapses to relearning, ease -200, lapses++", () => {
		const result = schedule(reviewCard(), 1, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("relearning");
		expect(result.ease).toBe(2300); // 2500 - 200
		expect(result.lapses).toBe(1);
		expect(result.intervalSec).toBe(600); // relearning step
		expect(result.reps).toBe(5); // reps unchanged on lapse
	});

	it("grade 1 ease floor: ease never goes below 1300", () => {
		const lowEaseCard = reviewCard(86400, 1400);
		const result = schedule(lowEaseCard, 1, DEFAULT_SETTINGS, NOW);
		// 1400 - 200 = 1200, clamped to 1300
		expect(result.ease).toBe(1300);
	});

	it("grade 2 (Hard): ease -150, interval * hardMultiplier, min +1 day enforced", () => {
		// intervalSec = 1 day; hard multiplier = 1.2
		// rawDays = 1 * 1.2 = 1.2 days; but min growth is prevDays+1 = 2
		const result = schedule(reviewCard(86400), 2, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("review");
		expect(result.ease).toBe(2350); // 2500 - 150
		expect(result.intervalSec).toBe(2 * 86400); // clamped up to prevDays+1
		expect(result.reps).toBe(6);
	});

	it("grade 3 (Good): ease unchanged, interval * ease factor", () => {
		// intervalSec = 1 day; ease = 2500 (2.5x)
		// rawDays = 1 * 2.5 = 2.5; max(2.5, 1+1=2) = 2.5
		const result = schedule(reviewCard(86400), 3, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("review");
		expect(result.ease).toBe(2500); // unchanged for Good
		expect(result.intervalSec).toBe(Math.round(2.5 * 86400));
		expect(result.reps).toBe(6);
	});

	it("grade 4 (Easy): ease +150, interval includes easy bonus", () => {
		// ease 2500 + 150 = 2650
		// rawDays = 1 * (2650/1000) * (1300/1000) = 3.445
		const result = schedule(reviewCard(86400), 4, DEFAULT_SETTINGS, NOW);
		expect(result.state).toBe("review");
		expect(result.ease).toBe(2650);
		expect(result.intervalSec).toBe(Math.round(3.445 * 86400));
		expect(result.reps).toBe(6);
	});

	it("interval respects maxIntervalDays cap", () => {
		const hugeCard = reviewCard(30_000 * 86400, 2500, 100); // 30k day interval
		const result = schedule(hugeCard, 3, DEFAULT_SETTINGS, NOW);
		expect(result.intervalSec).toBe(36500 * 86400);
	});
});

describe("schedule — due timestamp", () => {
	it("due = nowMs + intervalSec*1000 for review grades", () => {
		const result = schedule(reviewCard(86400), 3, DEFAULT_SETTINGS, NOW);
		expect(result.due).toBe(NOW + result.intervalSec * 1000);
	});
});

describe("settingsToScheduler", () => {
	const raw = {
		learningStepsSec: [60, 600],
		relearningStepsSec: [600],
		graduatingIntervalDays: 1,
		easyIntervalDays: 4,
		startingEase: 2500,
		easyBonusPermille: 1300,
		hardMultiplierPermille: 1200,
		intervalModifierPermille: 1000,
		maxIntervalDays: 36500,
	};

	it("maps scalar fields directly", () => {
		const s = settingsToScheduler(raw);
		expect(s.graduatingIntervalDays).toBe(1);
		expect(s.easyIntervalDays).toBe(4);
		expect(s.startingEase).toBe(2500);
		expect(s.maxIntervalDays).toBe(36500);
	});

	it("passes through valid numeric arrays", () => {
		const s = settingsToScheduler(raw);
		expect(s.learningStepsSec).toEqual([60, 600]);
		expect(s.relearningStepsSec).toEqual([600]);
	});

	it("converts string-number arrays to numbers", () => {
		const s = settingsToScheduler({ ...raw, learningStepsSec: ["60", "600"] });
		expect(s.learningStepsSec).toEqual([60, 600]);
	});

	it("filters out non-finite and zero values from arrays", () => {
		const s = settingsToScheduler({
			...raw,
			learningStepsSec: [60, Number.NaN, 0, -5, 300],
		});
		// NaN, 0, and negatives are invalid steps and should be filtered
		expect(s.learningStepsSec).toEqual([60, 300]);
	});

	it("returns empty array for non-array step values", () => {
		const s = settingsToScheduler({ ...raw, learningStepsSec: null });
		expect(s.learningStepsSec).toEqual([]);
	});

	it("returns empty array for object (non-array) step values", () => {
		const s = settingsToScheduler({ ...raw, relearningStepsSec: {} });
		expect(s.relearningStepsSec).toEqual([]);
	});
});
