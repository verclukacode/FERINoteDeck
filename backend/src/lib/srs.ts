// SM-2 (Anki-classic) spaced-repetition scheduler.
//
// Pure and deterministic: no Date.now() inside — `nowMs` is passed in so it is
// trivially unit-testable. It is type-agnostic; the caller maps each flashcard
// type to a grade (rate → 1-4; boolean/input → 1 or 3). Timestamps are unix ms,
// durations are seconds, ease is permille (2500 = 2.5x).

export type Grade = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export type CardState = "new" | "learning" | "review" | "relearning";

export interface SchedulerInput {
	state: CardState;
	intervalSec: number; // current interval (seconds)
	ease: number; // permille
	reps: number;
	lapses: number;
	learningStep: number; // index into the active steps array
}

export interface SchedulerSettings {
	learningStepsSec: number[];
	relearningStepsSec: number[];
	graduatingIntervalDays: number;
	easyIntervalDays: number;
	startingEase: number; // permille
	easyBonusPermille: number; // e.g. 1300 = 1.3x
	hardMultiplierPermille: number; // e.g. 1200 = 1.2x
	intervalModifierPermille: number; // global multiplier, e.g. 1000 = 1.0x
	maxIntervalDays: number;
}

export interface SchedulerResult {
	state: CardState;
	due: number; // unix ms
	intervalSec: number; // seconds
	ease: number; // permille
	reps: number;
	lapses: number;
	learningStep: number;
}

const EASE_FLOOR = 1300; // permille
const DAY_SEC = 86400;
const daysToSec = (d: number) => Math.round(d * DAY_SEC);
const secToMs = (s: number) => s * 1000;
const clampEase = (e: number) => Math.max(EASE_FLOOR, Math.round(e));

// Apply the global interval modifier, guarantee at least +1 day of growth over
// the previous interval, and cap at the maximum. Returns whole seconds.
function nextReviewIntervalSec(
	prevIntervalSec: number,
	rawDays: number,
	settings: SchedulerSettings,
): number {
	const prevDays = prevIntervalSec / DAY_SEC;
	let days = rawDays * (settings.intervalModifierPermille / 1000);
	days = Math.max(days, prevDays + 1);
	days = Math.min(days, settings.maxIntervalDays);
	return daysToSec(days);
}

// Resolve the active learning/relearning step array for the card's state.
function stepsFor(state: CardState, settings: SchedulerSettings): number[] {
	const steps =
		state === "relearning"
			? settings.relearningStepsSec
			: settings.learningStepsSec;
	return steps.length > 0 ? steps : [600]; // safety fallback: 10m
}

function graduate(
	grade: Grade,
	ease: number,
	reps: number,
	lapses: number,
	prevIntervalSec: number,
	settings: SchedulerSettings,
	nowMs: number,
): SchedulerResult {
	const days =
		grade === 4 ? settings.easyIntervalDays : settings.graduatingIntervalDays;
	const intervalSec = nextReviewIntervalSec(prevIntervalSec, days, settings);
	return {
		state: "review",
		intervalSec,
		ease,
		reps: reps + 1,
		lapses,
		learningStep: 0,
		due: nowMs + secToMs(intervalSec),
	};
}

export function schedule(
	card: SchedulerInput,
	grade: Grade,
	settings: SchedulerSettings,
	nowMs: number,
): SchedulerResult {
	const { intervalSec, reps, lapses } = card;
	let { ease, learningStep } = card;

	// New cards enter the learning queue and are handled like learning cards.
	const inLearning =
		card.state === "new" ||
		card.state === "learning" ||
		card.state === "relearning";

	if (inLearning) {
		const relearning = card.state === "relearning";
		const steps = stepsFor(card.state, settings);
		// New cards adopt the starting ease the first time they're seen.
		if (card.state === "new") ease = settings.startingEase;

		if (grade === 1) {
			// Again — restart steps.
			const stepSec = steps[0];
			return {
				state: relearning ? "relearning" : "learning",
				intervalSec: stepSec,
				ease,
				reps,
				lapses,
				learningStep: 0,
				due: nowMs + secToMs(stepSec),
			};
		}

		if (grade === 2) {
			// Hard — repeat the current step.
			const idx = Math.min(learningStep, steps.length - 1);
			const stepSec = steps[idx];
			return {
				state: relearning ? "relearning" : "learning",
				intervalSec: stepSec,
				ease,
				reps,
				lapses,
				learningStep: idx,
				due: nowMs + secToMs(stepSec),
			};
		}

		if (grade === 4) {
			// Easy — graduate immediately.
			return graduate(4, ease, reps, lapses, intervalSec, settings, nowMs);
		}

		// Good — advance one step, or graduate after the last step.
		const nextStep = learningStep + 1;
		if (nextStep < steps.length) {
			const stepSec = steps[nextStep];
			return {
				state: relearning ? "relearning" : "learning",
				intervalSec: stepSec,
				ease,
				reps,
				lapses,
				learningStep: nextStep,
				due: nowMs + secToMs(stepSec),
			};
		}
		return graduate(3, ease, reps, lapses, intervalSec, settings, nowMs);
	}

	// Review state.
	if (grade === 1) {
		// Again — lapse into relearning.
		const newEase = clampEase(ease - 200);
		const steps = stepsFor("relearning", settings);
		const stepSec = steps[0];
		return {
			state: "relearning",
			intervalSec: stepSec,
			ease: newEase,
			reps,
			lapses: lapses + 1,
			learningStep: 0,
			due: nowMs + secToMs(stepSec),
		};
	}

	let newEase = ease;
	let rawDays: number;
	const prevDays = intervalSec / DAY_SEC;
	if (grade === 2) {
		newEase = clampEase(ease - 150);
		rawDays = prevDays * (settings.hardMultiplierPermille / 1000);
	} else if (grade === 4) {
		newEase = clampEase(ease + 150);
		rawDays = prevDays * (newEase / 1000) * (settings.easyBonusPermille / 1000);
	} else {
		// Good
		rawDays = prevDays * (ease / 1000);
	}

	const nextIntervalSec = nextReviewIntervalSec(intervalSec, rawDays, settings);
	return {
		state: "review",
		intervalSec: nextIntervalSec,
		ease: newEase,
		reps: reps + 1,
		lapses,
		learningStep: 0,
		due: nowMs + secToMs(nextIntervalSec),
	};
}

// Map a StudySettings DB row to SchedulerSettings (casts JSON step arrays).
export function settingsToScheduler(s: {
	learningStepsSec: unknown;
	relearningStepsSec: unknown;
	graduatingIntervalDays: number;
	easyIntervalDays: number;
	startingEase: number;
	easyBonusPermille: number;
	hardMultiplierPermille: number;
	intervalModifierPermille: number;
	maxIntervalDays: number;
}): SchedulerSettings {
	const toSecArray = (v: unknown): number[] =>
		Array.isArray(v)
			? v.map(Number).filter((n) => Number.isFinite(n) && n > 0)
			: [];
	return {
		learningStepsSec: toSecArray(s.learningStepsSec),
		relearningStepsSec: toSecArray(s.relearningStepsSec),
		graduatingIntervalDays: s.graduatingIntervalDays,
		easyIntervalDays: s.easyIntervalDays,
		startingEase: s.startingEase,
		easyBonusPermille: s.easyBonusPermille,
		hardMultiplierPermille: s.hardMultiplierPermille,
		intervalModifierPermille: s.intervalModifierPermille,
		maxIntervalDays: s.maxIntervalDays,
	};
}
