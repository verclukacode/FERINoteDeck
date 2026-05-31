import { useEffect, useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import Modal from "../../components/Modal.jsx";
import { getDeckLeaderboard } from "../../services/flashcardsService.js";

function formatEase(permille) {
	if (permille == null) return "—";
	return (permille / 1000).toFixed(2);
}

export default function DeckLeaderboardModal({ deckId, onClose }) {
	const [rows, setRows] = useState(null);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		getDeckLeaderboard(deckId)
			.then((data) => {
				if (active) setRows(data);
			})
			.catch((e) => {
				if (active) setError(e?.message ?? "Failed to load leaderboard");
			});
		return () => {
			active = false;
		};
	}, [deckId]);

	const otherMembers = rows ? rows.filter((r) => !r.isMe).length : 0;

	return (
		<Modal open onClose={onClose}>
			<h2 className="px-1 text-2xl font-bold text-title">Leaderboard</h2>
			<p className="mt-1 px-1 text-sm text-body">
				Ranked by average recall ease (higher = stronger).
			</p>

			{error && (
				<p className="mt-4 text-center text-sm text-folder-red">{error}</p>
			)}

			{!error && rows === null && (
				<p className="mt-6 text-center text-sm text-body">Loading…</p>
			)}

			{rows !== null && rows.length === 0 && (
				<p className="mt-6 text-center text-sm text-body">
					No members yet — invite teammates to compete.
				</p>
			)}

			{rows !== null && rows.length > 0 && otherMembers === 0 && (
				<p className="mt-3 text-center text-xs text-body">
					Invite teammates to compete.
				</p>
			)}

			{rows !== null && rows.length > 0 && (
				<ol className="mt-4 flex flex-col gap-2">
					{rows.map((row, idx) => (
						<li
							key={`${row.userId}-${idx}`}
							className={`flex items-center gap-3 rounded-2xl border-[2.5px] px-4 py-3 ${
								row.isMe
									? "border-folder-blue bg-folder-blue/10"
									: "border-border-soft bg-bg"
							}`}
						>
							<span className="w-6 shrink-0 text-center text-sm font-bold text-body">
								{idx + 1}
							</span>
							<img
								src={row.avatarUrl ?? userProfilePic}
								alt={row.username ?? "User"}
								className="h-9 w-9 shrink-0 rounded-full border-[2px] border-border-soft object-cover"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold text-title">
									@{row.username ?? "anonymous"}
									{row.isOwner && (
										<span className="ml-2 rounded-full bg-folder-yellow/20 px-2 py-0.5 text-[10px] font-bold uppercase text-folder-yellow">
											Owner
										</span>
									)}
								</p>
								<p className="text-xs text-body">
									{row.cardCount} card{row.cardCount === 1 ? "" : "s"}
								</p>
							</div>
							<span className="shrink-0 text-lg font-bold text-title tabular-nums">
								{formatEase(row.avgEase)}
							</span>
						</li>
					))}
				</ol>
			)}

			<button
				type="button"
				onClick={onClose}
				className="mt-5 w-full py-1 font-medium text-title"
			>
				Close
			</button>
		</Modal>
	);
}
