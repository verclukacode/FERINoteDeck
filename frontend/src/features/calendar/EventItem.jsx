import Icon from "../../components/Icon.jsx";
import { folderHex } from "../../lib/constants.js";

function formatDate(dateStr) {
	return new Date(dateStr).toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function isToday(dateStr) {
	const d = new Date(dateStr);
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
}

function isPast(dateStr) {
	return new Date(dateStr) < new Date();
}

function daysUntil(dateStr) {
	const diff = new Date(dateStr) - new Date();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function EventItem({ event, onEdit, onDelete }) {
	const tagColor = event.tag ? folderHex(event.tag.color) : "#6b6b6b";
	const past = isPast(event.date);
	const days = daysUntil(event.date);

	let urgencyBadge = null;
	if (!past) {
		if (days <= 1) {
			urgencyBadge = (
				<span className="shrink-0 rounded-full bg-[#ff7070]/15 px-2 py-0.5 text-xs font-semibold text-[#ff7070]">
					Tomorrow
				</span>
			);
		} else if (days <= 3) {
			urgencyBadge = (
				<span className="shrink-0 rounded-full bg-[#ffa070]/15 px-2 py-0.5 text-xs font-semibold text-[#ffa070]">
					{days} days
				</span>
			);
		} else if (isToday(event.date)) {
			urgencyBadge = (
				<span className="shrink-0 rounded-full bg-[#ff7070]/15 px-2 py-0.5 text-xs font-semibold text-[#ff7070]">
					Today
				</span>
			);
		}
	}

	return (
		<div
			className={`group flex items-start gap-3 rounded-[14px] border-[2.5px] border-border-soft bg-bg p-3 transition-opacity ${past ? "opacity-50" : ""}`}
		>
			{/* Colored left accent bar */}
			<div
				className="mt-0.5 h-full w-1 shrink-0 rounded-full"
				style={{ backgroundColor: tagColor, minHeight: 36 }}
			/>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p
						className={`min-w-0 flex-1 truncate text-sm font-semibold text-title ${past ? "line-through" : ""}`}
					>
						{event.name}
					</p>
					{urgencyBadge}
				</div>
				<p className="mt-0.5 text-xs text-body">{formatDate(event.date)}</p>
				{event.description && (
					<p className="mt-1 line-clamp-2 text-xs text-body">
						{event.description}
					</p>
				)}
				{event.tag && (
					<span
						className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-bg"
						style={{ backgroundColor: tagColor }}
					>
						{event.tag.name}
					</span>
				)}
			</div>

			<div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				<button
					type="button"
					onClick={() => onEdit(event)}
					className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
					aria-label="Edit event"
				>
					<Icon name="document" size={14} />
				</button>
				<button
					type="button"
					onClick={() => onDelete(event.id)}
					className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
					aria-label="Delete event"
				>
					<Icon name="trash" size={14} />
				</button>
			</div>
		</div>
	);
}
