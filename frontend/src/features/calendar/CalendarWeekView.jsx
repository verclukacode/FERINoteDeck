import { useMemo, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { folderHex } from "../../lib/constants.js";

const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfWeek(date) {
	const d = new Date(date);
	const day = d.getDay(); // 0=Sun
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function addDays(date, n) {
	const d = new Date(date);
	d.setDate(d.getDate() + n);
	return d;
}

function toKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarWeekView({ events, selectedDay, onSelectDay }) {
	const today = new Date();
	const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(today));

	const days = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart],
	);

	const eventsByDay = useMemo(() => {
		const map = {};
		for (const e of events) {
			const key = toKey(new Date(e.date));
			if (!map[key]) map[key] = [];
			map[key].push(e);
		}
		return map;
	}, [events]);

	const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

	return (
		<div className="flex flex-col gap-3">
			{/* Week navigation */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => setWeekStart((ws) => addDays(ws, -7))}
					className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
				>
					<Icon name="chevron" size={14} className="rotate-180" />
				</button>
				<p className="text-sm font-bold text-title">{rangeLabel}</p>
				<button
					type="button"
					onClick={() => setWeekStart((ws) => addDays(ws, 7))}
					className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
				>
					<Icon name="chevron" size={14} />
				</button>
			</div>

			{/* Day columns */}
			<div className="grid grid-cols-7 gap-1.5">
				{days.map((day, i) => {
					const key = toKey(day);
					const dayEvents = eventsByDay[key] ?? [];
					const isToday = toKey(today) === key;
					const isSelected = selectedDay === key;

					return (
						<button
							key={key}
							type="button"
							onClick={() => onSelectDay(isSelected ? null : key)}
							className={`flex flex-col items-center rounded-[12px] px-1 py-2 transition-colors ${
								isSelected
									? "bg-title text-bg"
									: isToday
										? "bg-bg-secondary"
										: "hover:bg-bg-secondary text-body"
							}`}
						>
							<span className="text-xs font-semibold">{WEEKDAYS_SHORT[i]}</span>
							<span
								className={`mt-0.5 text-sm ${isToday ? "font-bold text-title" : ""} ${isSelected ? "text-bg" : ""}`}
							>
								{day.getDate()}
							</span>
							{/* Event pills */}
							<div className="mt-1 flex flex-col gap-0.5 w-full">
								{dayEvents.slice(0, 3).map((e) => (
									<span
										key={e.id}
										className="block h-1.5 w-full rounded-full"
										style={{
											backgroundColor: e.tag
												? folderHex(e.tag.color)
												: isSelected
													? "#ffffff"
													: "#6b6b6b",
										}}
									/>
								))}
								{dayEvents.length > 3 && (
									<span
										className={`text-center text-[9px] ${isSelected ? "text-bg" : "text-body"}`}
									>
										+{dayEvents.length - 3}
									</span>
								)}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
