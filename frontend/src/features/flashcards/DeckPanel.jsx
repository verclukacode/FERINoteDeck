import { useEffect, useState } from "react";
import Icon from "../../components/Icon.jsx";
import ShareModal from "../../components/ShareModal.jsx";
import {
	getDeckLeaderboard,
	getDeckQueue,
	getDeckTodayStats,
	getStreak,
} from "../../services/flashcardsService.js";
import ActivityModal from "./ActivityModal.jsx";
import DeckLeaderboardModal from "./DeckLeaderboardModal.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";
import StudySession from "./StudySession.jsx";

function formatTime(ms) {
	if (!ms) return "0s";
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rem = s % 60;
	return rem ? `${m}m ${rem}s` : `${m}m`;
}

function TodayStats({ stats, streak, onOpenActivity }) {
	const hasStreak = streak && streak.streak > 0;
	const hasStats = stats && stats.count > 0;
	if (!hasStreak && !hasStats) return null;

	return (
		<div className="border-b-2 border-border-soft px-5 py-3 flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-body">
					Today
				</span>
				<button
					type="button"
					onClick={onOpenActivity}
					className="text-xs font-semibold text-folder-blue hover:underline"
				>
					30-day chart →
				</button>
			</div>
			<div className="flex items-center gap-2">
				{hasStreak && (
					<div
						className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${
							streak.studiedToday ? "bg-folder-orange/15" : "bg-bg-secondary"
						}`}
					>
						<span className="text-xl">🔥</span>
						<div>
							<p
								className={`text-base font-bold leading-none ${streak.studiedToday ? "text-folder-orange" : "text-body"}`}
							>
								{streak.streak} day{streak.streak !== 1 ? "s" : ""}
							</p>
							<p className="text-[10px] text-body mt-0.5">streak</p>
						</div>
					</div>
				)}
				{hasStats && (
					<>
						<div className="flex items-center gap-2 rounded-[14px] bg-bg-secondary px-3 py-1.5">
							<span className="text-sm font-bold text-title">
								{stats.count}
							</span>
							<span className="text-xs text-body">cards</span>
						</div>
						{stats.correctRate !== null && (
							<div className="flex items-center gap-2 rounded-[14px] bg-bg-secondary px-3 py-1.5">
								<span
									className={`text-sm font-bold ${stats.correctRate >= 80 ? "text-folder-green" : stats.correctRate >= 50 ? "text-folder-blue" : "text-folder-red"}`}
								>
									{stats.correctRate}%
								</span>
								<span className="text-xs text-body">correct</span>
							</div>
						)}
						<div className="flex items-center gap-2 rounded-[14px] bg-bg-secondary px-3 py-1.5">
							<span className="text-sm font-bold text-title">
								{formatTime(stats.totalMs)}
							</span>
							<span className="text-xs text-body">time</span>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

const STATE_CONFIG = [
	{ key: "new", label: "New", color: "bg-folder-blue" },
	{ key: "learning", label: "Learning", color: "bg-[#ffbb00]" },
	{ key: "relearning", label: "Relearning", color: "bg-folder-orange" },
	{ key: "review", label: "Review", color: "bg-folder-green" },
];

function CardStateBar({ cards }) {
	if (!cards.length) return null;

	const counts = { new: 0, learning: 0, relearning: 0, review: 0 };
	for (const c of cards) {
		if (counts[c.state] !== undefined) counts[c.state]++;
	}

	const total = cards.length;
	const visible = STATE_CONFIG.filter((s) => counts[s.key] > 0);

	return (
		<div className="px-5 py-3 border-b-2 border-border-soft flex flex-col gap-2">
			<div className="flex h-2 w-full overflow-hidden rounded-full gap-0.5">
				{visible.map((s) => (
					<div
						key={s.key}
						className={`${s.color} h-full rounded-full`}
						style={{ width: `${(counts[s.key] / total) * 100}%` }}
					/>
				))}
			</div>
			<div className="flex gap-4">
				{visible.map((s) => (
					<div key={s.key} className="flex items-center gap-1.5">
						<span className={`h-2 w-2 rounded-full ${s.color}`} />
						<span className="text-xs text-body">
							{s.label}{" "}
							<span className="font-semibold text-title">{counts[s.key]}</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// Editable deck title — Enter (or blur) commits, empty input reverts.
function DeckTitle({ deck, onRename }) {
	const [value, setValue] = useState(deck.name);

	const commit = () => {
		const next = value.trim();
		if (next && next !== deck.name) onRename(deck.id, next);
		else setValue(deck.name);
	};

	return (
		<input
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") e.currentTarget.blur();
			}}
			onBlur={commit}
			className="-mx-2 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-3xl font-bold text-title outline-none focus:bg-bg"
		/>
	);
}

function QuestionRow({ card, selected, onSelect }) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`flex w-full items-center gap-3 rounded-[22.5px] border-[2.5px] px-5 py-4 text-left transition-colors ${
				selected
					? "border-folder-blue bg-folder-blue/15"
					: "border-transparent bg-bg hover:border-border-soft"
			}`}
		>
			<span className="flex-1 font-medium text-title line-clamp-2">
				{card.question || (
					<span className="text-body/60">Untitled question</span>
				)}
			</span>
			<Icon name="chevron" size={14} className="shrink-0 text-body" />
		</button>
	);
}

export default function DeckPanel() {
	const {
		selectedDeck,
		deckCards,
		selectedCardId,
		selectCard,
		addCard,
		renameDeck,
		updateDeckShare,
		deckShares,
		revokeDeckShare,
	} = useFlashcards();
	const [studying, setStudying] = useState(false);
	const [sharing, setSharing] = useState(false);
	const [leaderboardOpen, setLeaderboardOpen] = useState(false);
	const [activityOpen, setActivityOpen] = useState(false);
	const [memberCount, setMemberCount] = useState(0);
	const [dueCount, setDueCount] = useState(null);
	const [todayStats, setTodayStats] = useState(null);
	const [streak, setStreak] = useState(null);

	const deckId = selectedDeck?.id;
	// Re-fetch the due count when the deck changes, after a study session closes,
	// and when card states change (add/delete/reset). `statesSig` is only a
	// re-run trigger, hence not read inside the effect.
	const statesSig = deckCards.map((c) => `${c.id}:${c.state}`).join("|");
	// biome-ignore lint/correctness/useExhaustiveDependencies: statesSig intentionally re-triggers the count fetch
	useEffect(() => {
		if (!deckId || studying) return;
		let active = true;
		getDeckQueue(deckId)
			.then((data) => {
				if (!active) return;
				const c = data?.counts ?? { new: 0, learning: 0, review: 0 };
				setDueCount(c.new + c.learning + c.review);
			})
			.catch(() => active && setDueCount(0));
		getDeckTodayStats(deckId)
			.then((s) => active && setTodayStats(s))
			.catch(() => {});
		getStreak()
			.then((s) => active && setStreak(s))
			.catch(() => {});
		return () => {
			active = false;
		};
	}, [deckId, studying, statesSig]);

	// Member count drives whether the Leaderboard button shows — solo decks
	// have no one to rank against.
	useEffect(() => {
		if (!deckId) {
			setMemberCount(0);
			return;
		}
		let active = true;
		getDeckLeaderboard(deckId)
			.then((rows) => active && setMemberCount(rows?.length ?? 0))
			.catch(() => active && setMemberCount(0));
		return () => {
			active = false;
		};
	}, [deckId]);

	if (!selectedDeck) {
		return (
			<main className="flex flex-1 items-center justify-center rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary text-body">
				Select a deck to open it.
			</main>
		);
	}

	return (
		<main className="flex flex-1 flex-col overflow-hidden rounded-[30px] border-[2.5px] border-border-soft bg-bg-secondary">
			<div className="flex h-[88px] items-center gap-4 border-b-2 border-border-soft px-6">
				<DeckTitle
					key={selectedDeck.id}
					deck={selectedDeck}
					onRename={renameDeck}
				/>
				{memberCount >= 2 && (
					<button
						type="button"
						onClick={() => setLeaderboardOpen(true)}
						className="flex h-[45px] items-center gap-2 rounded-full border-[2.5px] border-border-soft bg-bg px-4 text-[15px] font-semibold text-title"
						aria-label="Leaderboard"
					>
						<Icon name="party" size={20} />
						Leaderboard
					</button>
				)}
				{!selectedDeck.sharedFromDeckId && (
					<button
						type="button"
						onClick={() => setSharing(true)}
						className="flex h-[45px] w-[45px] items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title"
						aria-label="Share deck"
					>
						<Icon name="paperplane" size={20} />
					</button>
				)}
				<button
					type="button"
					disabled={!dueCount}
					onClick={() => setStudying(true)}
					className="flex h-[45px] items-center gap-2 rounded-full border-[2.5px] border-folder-pink/30 bg-folder-pink/15 px-5 text-[15px] font-semibold text-folder-pink disabled:opacity-40"
				>
					<Icon name="study-hat" size={20} />
					Study {dueCount ?? 0}
				</button>
			</div>

			<CardStateBar cards={deckCards} />
			<TodayStats
				stats={todayStats}
				streak={streak}
				onOpenActivity={() => setActivityOpen(true)}
			/>

			<div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
				{deckCards.map((card) => (
					<QuestionRow
						key={card.id}
						card={card}
						selected={card.id === selectedCardId}
						onSelect={() => selectCard(card.id)}
					/>
				))}

				<button
					type="button"
					onClick={() => addCard(selectedDeck.id)}
					className="min-h-[62px] w-full rounded-[22.5px] border-2 border-dashed border-body/40 font-semibold text-title"
				>
					Add flashcard
				</button>
			</div>

			{studying && (
				<StudySession
					deckId={selectedDeck.id}
					onClose={() => setStudying(false)}
				/>
			)}

			{sharing && (
				<ShareModal
					kind="deck"
					item={selectedDeck}
					onSave={(patch) => updateDeckShare(selectedDeck.id, patch)}
					onClose={() => setSharing(false)}
					sharedWith={deckShares[selectedDeck.id] ?? []}
					onRevoke={(inviteId) => revokeDeckShare(inviteId, selectedDeck.id)}
				/>
			)}

			{leaderboardOpen && (
				<DeckLeaderboardModal
					deckId={selectedDeck.id}
					onClose={() => setLeaderboardOpen(false)}
				/>
			)}
			{activityOpen && <ActivityModal onClose={() => setActivityOpen(false)} />}
		</main>
	);
}
