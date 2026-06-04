import { useMemo, useState } from "react";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import { FOLDER_COLORS, folderHex } from "../../lib/constants.js";
import { useCalendar } from "./CalendarContext.jsx";
import CalendarMonthView from "./CalendarMonthView.jsx";
import CalendarWeekView from "./CalendarWeekView.jsx";
import EventFormModal from "./EventFormModal.jsx";
import EventItem from "./EventItem.jsx";

const FOLDER_COLOR_MAP = Object.fromEntries(
	FOLDER_COLORS.map((c) => [c.key, c.hex]),
);

export default function CalendarModal({ onClose }) {
	const { tags, events, loading, removeEvent } = useCalendar();

	const [view, setView] = useState("month"); // "month" | "week"
	const [selectedDay, setSelectedDay] = useState(null); // "YYYY-MM-DD" or null
	const [activeTagId, setActiveTagId] = useState(null); // null = all
	const [showPast, setShowPast] = useState(false);
	const [formEvent, setFormEvent] = useState(undefined); // undefined = closed, null = create, object = edit
	const [confirmDeleteId, setConfirmDeleteId] = useState(null);

	const filteredEvents = useMemo(() => {
		const now = new Date();
		let list = events;

		// Tag filter
		if (activeTagId !== null) {
			list = list.filter((e) => e.tagId === activeTagId);
		}

		// Day filter (from calendar click)
		if (selectedDay) {
			list = list.filter((e) => {
				const d = new Date(e.date);
				const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
				return key === selectedDay;
			});
		}

		// Past filter
		if (!showPast) {
			list = list.filter((e) => new Date(e.date) >= now);
		}

		return list;
	}, [events, activeTagId, selectedDay, showPast]);

	const handleDelete = async (id) => {
		setConfirmDeleteId(id);
	};

	const confirmDelete = async () => {
		if (!confirmDeleteId) return;
		await removeEvent(confirmDeleteId);
		setConfirmDeleteId(null);
	};

	return (
		<>
			<Modal open onClose={onClose} className="w-[820px] p-0">
				<div className="flex h-[calc(100dvh-2rem)] max-h-[560px] flex-col sm:h-[560px] sm:flex-row">
					{/* LEFT — Calendar */}
					<div className="flex flex-col gap-4 border-b-[2.5px] border-border-soft p-5 sm:w-[360px] sm:shrink-0 sm:border-b-0 sm:border-r-[2.5px] sm:p-6">
						{/* Header */}
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold text-title">Calendar</h2>
							<div className="flex rounded-[22.5px] border-[2.5px] border-border-soft p-0.5">
								<button
									type="button"
									onClick={() => setView("month")}
									className={`rounded-[18px] px-3 py-1 text-xs font-semibold transition-colors ${
										view === "month"
											? "bg-title text-bg"
											: "text-body hover:text-title"
									}`}
								>
									Month
								</button>
								<button
									type="button"
									onClick={() => setView("week")}
									className={`rounded-[18px] px-3 py-1 text-xs font-semibold transition-colors ${
										view === "week"
											? "bg-title text-bg"
											: "text-body hover:text-title"
									}`}
								>
									Week
								</button>
							</div>
						</div>

						{/* Calendar view */}
						{view === "month" ? (
							<CalendarMonthView
								events={events}
								selectedDay={selectedDay}
								onSelectDay={setSelectedDay}
							/>
						) : (
							<CalendarWeekView
								events={events}
								selectedDay={selectedDay}
								onSelectDay={setSelectedDay}
							/>
						)}

						{/* Legend */}
						{tags.length > 0 && (
							<div className="mt-auto flex flex-wrap gap-2 pt-2 border-t-[2px] border-border-soft">
								{tags.map((t) => (
									<span
										key={t.id}
										className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-bg"
										style={{
											backgroundColor:
												FOLDER_COLOR_MAP[t.color] ?? folderHex(t.color),
										}}
									>
										{t.name}
									</span>
								))}
							</div>
						)}
					</div>

					{/* RIGHT — Event list */}
					<div className="flex flex-1 flex-col overflow-hidden">
						{/* Right header: tag filters + add button */}
						<div className="flex shrink-0 items-center gap-2 border-b-[2.5px] border-border-soft px-5 py-4">
							<div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
								<button
									type="button"
									onClick={() => setActiveTagId(null)}
									className={`h-[30px] rounded-[22.5px] border-[2.5px] px-3 text-xs font-semibold transition-colors ${
										activeTagId === null
											? "border-title bg-title text-bg"
											: "border-border-soft text-body hover:border-title/30"
									}`}
								>
									All
								</button>
								{tags.map((t) => {
									const hex = FOLDER_COLOR_MAP[t.color] ?? folderHex(t.color);
									const active = activeTagId === t.id;
									return (
										<button
											key={t.id}
											type="button"
											onClick={() => setActiveTagId(active ? null : t.id)}
											className={`flex h-[30px] items-center gap-1.5 rounded-[22.5px] border-[2.5px] px-3 text-xs font-semibold transition-colors ${
												active
													? "border-transparent text-bg"
													: "border-border-soft text-body hover:border-title/30"
											}`}
											style={
												active ? { backgroundColor: hex, borderColor: hex } : {}
											}
										>
											<span
												className="h-2 w-2 shrink-0 rounded-full"
												style={{ backgroundColor: active ? "#ffffff" : hex }}
											/>
											{t.name}
										</button>
									);
								})}
							</div>
							<button
								type="button"
								onClick={() => setFormEvent(null)}
								className="ml-2 flex h-[30px] shrink-0 items-center gap-1.5 rounded-[22.5px] bg-title px-3 text-xs font-semibold text-bg hover:opacity-80"
							>
								<Icon name="plus" size={12} />
								Add
							</button>
							<button
								type="button"
								onClick={onClose}
								className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
								aria-label="Close"
							>
								<Icon name="xmark" size={16} />
							</button>
						</div>

						{/* Selected day indicator */}
						{selectedDay && (
							<div className="flex shrink-0 items-center justify-between px-5 py-2 bg-bg-secondary">
								<p className="text-xs font-semibold text-body">
									Filtered to{" "}
									{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
										undefined,
										{
											weekday: "short",
											month: "short",
											day: "numeric",
										},
									)}
								</p>
								<button
									type="button"
									onClick={() => setSelectedDay(null)}
									className="text-xs text-body hover:text-title"
								>
									Clear
								</button>
							</div>
						)}

						{/* Event list */}
						<div className="flex-1 overflow-y-auto px-5 py-4">
							{loading ? (
								<p className="text-sm text-body">Loading...</p>
							) : filteredEvents.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-2 py-10 text-body">
									<Icon name="calendar" size={32} />
									<p className="text-sm">
										{selectedDay
											? "No events on this day"
											: "No upcoming events"}
									</p>
								</div>
							) : (
								<div className="flex flex-col gap-2">
									{filteredEvents.map((e) => (
										<EventItem
											key={e.id}
											event={e}
											onEdit={(ev) => setFormEvent(ev)}
											onDelete={handleDelete}
										/>
									))}
								</div>
							)}
						</div>

						{/* Show past toggle */}
						<div className="shrink-0 border-t-[2px] border-border-soft px-5 py-3">
							<button
								type="button"
								onClick={() => setShowPast((v) => !v)}
								className="text-xs font-semibold text-body hover:text-title"
							>
								{showPast ? "Hide past events" : "Show past events"}
							</button>
						</div>
					</div>
				</div>
			</Modal>

			{/* Event create/edit form */}
			{formEvent !== undefined && (
				<EventFormModal
					event={formEvent}
					prefillDate={formEvent === null ? selectedDay : undefined}
					onClose={() => setFormEvent(undefined)}
				/>
			)}

			{/* Confirm delete */}
			{confirmDeleteId && (
				<Modal open onClose={() => setConfirmDeleteId(null)}>
					<h2 className="px-1 text-2xl font-bold text-title">Delete event?</h2>
					<p className="mt-2 px-1 text-sm text-body">
						This action cannot be undone.
					</p>
					<div className="mt-6 flex flex-col gap-2">
						<button
							type="button"
							onClick={confirmDelete}
							className="h-[45px] w-full rounded-[22.5px] bg-[#ff7070] font-semibold text-bg shadow-[0_2.5px_0_rgba(180,50,50,0.4)] active:translate-y-[2.5px] active:shadow-none"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={() => setConfirmDeleteId(null)}
							className="h-[45px] w-full text-[17px] font-semibold text-title"
						>
							Cancel
						</button>
					</div>
				</Modal>
			)}
		</>
	);
}
