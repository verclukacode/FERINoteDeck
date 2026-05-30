import { useMemo, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { folderHex } from "../../lib/constants.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year, month) {
	return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Mon … 6=Sun
function firstDayOfMonth(year, month) {
	const d = new Date(year, month, 1).getDay();
	return d === 0 ? 6 : d - 1;
}

export default function CalendarMonthView({
	events,
	selectedDay,
	onSelectDay,
	defaultYear,
	defaultMonth,
}) {
	const today = new Date();
	const [year, setYear] = useState(defaultYear ?? today.getFullYear());
	const [month, setMonth] = useState(defaultMonth ?? today.getMonth());

	const daysInMonth = getDaysInMonth(year, month);
	const startOffset = firstDayOfMonth(year, month);

	// Map: "YYYY-MM-DD" → events[]
	const eventsByDay = useMemo(() => {
		const map = {};
		for (const e of events) {
			const d = new Date(e.date);
			if (d.getFullYear() === year && d.getMonth() === month) {
				const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
				if (!map[key]) map[key] = [];
				map[key].push(e);
			}
		}
		return map;
	}, [events, year, month]);

	function prevMonth() {
		if (month === 0) {
			setYear((y) => y - 1);
			setMonth(11);
		} else setMonth((m) => m - 1);
	}
	function nextMonth() {
		if (month === 11) {
			setYear((y) => y + 1);
			setMonth(0);
		} else setMonth((m) => m + 1);
	}

	const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
		month: "long",
		year: "numeric",
	});

	// Build grid: leading empty cells + day cells
	const cells = [];
	for (let i = 0; i < startOffset; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(d);
	// Pad to full 6 rows
	while (cells.length % 7 !== 0) cells.push(null);

	return (
		<div className="flex flex-col gap-3">
			{/* Month navigation */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={prevMonth}
					className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
				>
					<Icon name="chevron" size={14} className="rotate-180" />
				</button>
				<p className="text-sm font-bold text-title">{monthLabel}</p>
				<button
					type="button"
					onClick={nextMonth}
					className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
				>
					<Icon name="chevron" size={14} />
				</button>
			</div>

			{/* Weekday headers */}
			<div className="grid grid-cols-7 gap-1">
				{WEEKDAYS.map((d) => (
					<div key={d} className="text-center text-xs font-semibold text-body">
						{d}
					</div>
				))}
			</div>

			{/* Day cells */}
			<div className="grid grid-cols-7 gap-1">
				{cells.map((day, idx) => {
					if (day === null) return <div key={`empty-${String(idx)}`} />;
					const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					const dayEvents = eventsByDay[key] ?? [];
					const isToday =
						today.getFullYear() === year &&
						today.getMonth() === month &&
						today.getDate() === day;
					const isSelected = selectedDay === key;

					return (
						<button
							key={key}
							type="button"
							onClick={() => onSelectDay(isSelected ? null : key)}
							className={`flex flex-col items-center rounded-[10px] py-1.5 transition-colors ${
								isSelected
									? "bg-title text-bg"
									: isToday
										? "bg-bg-secondary font-bold text-title"
										: "text-body hover:bg-bg-secondary"
							}`}
						>
							<span
								className={`text-sm ${isToday && !isSelected ? "font-bold" : ""}`}
							>
								{day}
							</span>
							{/* Event dots: up to 4, then +N overflow */}
							{dayEvents.length > 0 && (
								<div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5 max-w-[36px]">
									{dayEvents.slice(0, 4).map((e) => (
										<span
											key={e.id}
											className="h-1.5 w-1.5 rounded-full"
											style={{
												backgroundColor: e.tag
													? folderHex(e.tag.color)
													: isSelected
														? "#ffffff88"
														: "#6b6b6b",
											}}
										/>
									))}
									{dayEvents.length > 4 && (
										<span
											className="text-[7px] font-bold leading-none"
											style={{ color: isSelected ? "#ffffffaa" : "#6b6b6b" }}
										>
											+{dayEvents.length - 4}
										</span>
									)}
								</div>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
