import { prisma } from "./prisma";

// Load the user's study settings, creating a default row on first access.
// Schema defaults fill every field, so `create: { userId }` is enough.
export function getOrCreateStudySettings(userId: string) {
	return prisma.studySettings.upsert({
		where: { userId },
		create: { userId },
		update: {},
	});
}

// Reset fields applied by "Forget" (card reset / deck reset): back to a fresh
// new card. Review history (revlog) is intentionally preserved.
export const RESET_CARD_FIELDS = {
	state: "new",
	due: null,
	intervalSec: BigInt(0),
	ease: 2500,
	reps: 0,
	lapses: 0,
	learningStep: 0,
	lastReviewedAt: null,
} as const;
