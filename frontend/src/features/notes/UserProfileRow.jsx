import { useState } from "react";
import userProfilePic from "../../assets/userProfilePic.svg";
import Icon from "../../components/Icon.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useCalendar } from "../calendar/CalendarContext.jsx";
import CalendarModal from "../calendar/CalendarModal.jsx";
import { useNotes } from "./NotesContext.jsx";

export default function UserProfileRow() {
	const { user } = useAuth();
	const { setAccountOpen, avatarUrl, username } = useNotes();
	const { events } = useCalendar();
	const [calendarOpen, setCalendarOpen] = useState(false);

	// Compute urgency dot from upcoming events
	const now = new Date();
	const in3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
	const in1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
	const hasUrgent = events.some((e) => {
		const d = new Date(e.date);
		return d >= now && d <= in1;
	});
	const hasWarning =
		!hasUrgent &&
		events.some((e) => {
			const d = new Date(e.date);
			return d >= now && d <= in3;
		});
	const dotColor = hasUrgent ? "#ff7070" : hasWarning ? "#ffa070" : null;

	return (
		<>
			<div className="flex w-full items-center gap-3 border-t-2 border-border-soft px-5 py-4">
				<button
					type="button"
					onClick={() => setAccountOpen(true)}
					className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
				>
					<div className="h-[50px] w-[50px] shrink-0 overflow-hidden rounded-full border-[2.5px] border-border-soft bg-bg">
						<img
							src={avatarUrl ?? userProfilePic}
							alt="Profile"
							className="h-full w-full object-cover"
						/>
					</div>
					<span className="min-w-0 flex-1 truncate text-left font-medium text-title">
						{username || (user?.email?.split("@")[0] ?? "")}
					</span>
				</button>
				<button
					type="button"
					onClick={() => setCalendarOpen(true)}
					className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-bg-secondary text-body"
					aria-label="Open calendar"
				>
					<Icon name="calendar" size={18} />
					{dotColor && (
						<span
							className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-bg"
							style={{ backgroundColor: dotColor }}
						/>
					)}
				</button>
				<button
					type="button"
					onClick={() => setAccountOpen(true)}
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-bg-secondary"
					aria-label="Open settings"
				>
					<Icon name="chevron" size={14} className="rotate-90 text-body" />
				</button>
			</div>

			{calendarOpen && <CalendarModal onClose={() => setCalendarOpen(false)} />}
		</>
	);
}
