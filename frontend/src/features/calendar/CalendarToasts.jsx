import { useEffect, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { getUpcomingEvents } from "../../services/calendarService.js";

const LS_KEY = "calendarToastDate";

// Mirror of folderHex from constants.js
const TAG_COLORS = {
	red: "#ff7070",
	orange: "#ffa070",
	pink: "#ff70c3",
	green: "#2fd5b1",
	blue: "#499ef3",
	purple: "#7092ff",
};
function tagHex(key) {
	return TAG_COLORS[key] ?? TAG_COLORS.blue;
}

function Toast({ event, urgency, onDismiss }) {
	const isUrgent = urgency === "urgent";
	const color = isUrgent ? "#ff7070" : "#ffa070";
	const borderShadow = isUrgent
		? "border-[#ff7070] shadow-[0_5px_0_rgba(255,112,112,0.25)]"
		: "border-[#ffa070] shadow-[0_5px_0_rgba(255,160,112,0.25)]";
	const label = isUrgent ? "Tomorrow" : "In 3 days";

	const dateStr = new Date(event.date).toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});

	return (
		<div
			className={`flex w-[360px] items-center gap-3 rounded-[22.5px] border-[2.5px] bg-bg px-4 py-3 ${borderShadow}`}
		>
			<span style={{ color }} className="shrink-0">
				<Icon name="calendar" size={18} />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-title">
					{event.name}
				</p>
				<p className="text-xs text-body">
					{label} · {dateStr}
				</p>
			</div>
			{event.tag && (
				<span
					className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-bg"
					style={{
						backgroundColor: event.tag.color ? tagHex(event.tag.color) : color,
					}}
				>
					{event.tag.name}
				</span>
			)}
			<button
				type="button"
				onClick={() => onDismiss(event.id)}
				className="shrink-0 text-body hover:text-title"
				aria-label="Dismiss"
			>
				<Icon name="xmark" size={14} />
			</button>
		</div>
	);
}

// Stack constants
const TOAST_H = 54; // approximate toast height in px
const PEEK = 8; // px each deeper card peeks above the one in front
const GAP = 16; // gap between toasts when expanded
const MAX_PEEK = 3; // max number of peeking cards behind the front

export default function CalendarToasts() {
	const [toasts, setToasts] = useState([]);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		const today = new Date().toISOString().slice(0, 10);
		if (localStorage.getItem(LS_KEY) === today) return;

		getUpcomingEvents()
			.then(({ warning = [], urgent = [] }) => {
				const items = [
					...urgent.map((e) => ({ ...e, urgency: "urgent" })),
					...warning.map((e) => ({ ...e, urgency: "warning" })),
				];
				if (items.length > 0) setToasts(items);
			})
			.catch(() => {});
	}, []);

	const dismiss = (id) => {
		setToasts((prev) => {
			const next = prev.filter((t) => t.id !== id);
			if (next.length === 0) {
				localStorage.setItem(LS_KEY, new Date().toISOString().slice(0, 10));
			}
			return next;
		});
	};

	const count = toasts.length;
	if (count === 0) return null;

	const isStacked = count > 1 && !expanded;

	// Container height: in stacked mode covers just the front card + peek tops;
	// in expanded mode covers the full column so hover stays active.
	const peekCount = Math.min(count - 1, MAX_PEEK - 1);
	const stackedH = TOAST_H + peekCount * PEEK;
	const expandedH = count * TOAST_H + (count - 1) * GAP;

	return (
		<div
			className="fixed left-1/2 z-[60] -translate-x-1/2"
			style={{
				bottom: "1.5rem",
				width: 360,
				height: expanded ? expandedH : stackedH,
				transition: "height 300ms ease",
			}}
			onMouseEnter={() => count > 1 && setExpanded(true)}
			onMouseLeave={() => setExpanded(false)}
		>
			{toasts.map((t, i) => {
				// i=0 → most urgent → front of stack (highest z-index)
				const zIndex = count - i;
				// Stacked: deeper cards peek upward (negative Y = up) behind the front card
				// Expanded: cards spread upward from bottom, i=0 stays at bottom
				const translateY = isStacked ? -(i * PEEK) : -(i * (TOAST_H + GAP));
				const scale = isStacked ? 1 - i * 0.04 : 1;
				// Hide cards beyond MAX_PEEK in stacked mode
				const opacity = isStacked && i >= MAX_PEEK ? 0 : 1;

				return (
					<div
						key={t.id}
						className="absolute bottom-0 left-0 right-0 transition-all duration-300"
						style={{
							transform: `translateY(${translateY}px) scale(${scale})`,
							transformOrigin: "bottom center",
							zIndex,
							opacity,
						}}
					>
						<Toast event={t} urgency={t.urgency} onDismiss={dismiss} />
					</div>
				);
			})}
		</div>
	);
}
