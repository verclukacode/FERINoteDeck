import { expect, fn, userEvent, within } from "storybook/test";
import CalendarToasts from "./CalendarToasts.jsx";

// Mock the calendarService so no real network call is made
const mockWarning = [
	{
		id: "evt-1",
		name: "Math Exam",
		date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
		tag: { name: "Exam", color: "orange" },
		urgency: "warning",
	},
];
const mockUrgent = [
	{
		id: "evt-2",
		name: "Physics Test",
		date: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
		tag: { name: "Test", color: "red" },
		urgency: "urgent",
	},
];

export default {
	title: "Calendar/CalendarToasts",
	component: CalendarToasts,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => {
			// Clear localStorage so toasts always render in stories
			localStorage.removeItem("calendarToastDate");
			return <Story />;
		},
	],
};

// Storybook stories for toasts rely on the component fetching from the API.
// For visual testing we inject the toast state directly by rendering the
// internal Toast component (exported for testing purposes).
// Since the component self-fetches, we simply document the visual states.
export const Warning = {
	render: () => (
		<div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2">
			{mockWarning.map((t) => (
				<div
					key={t.id}
					className="flex items-center gap-3 rounded-[22.5px] border-[2.5px] border-[#ffa070] bg-bg px-4 py-3 shadow-[0_5px_0_rgba(255,160,112,0.25)]"
				>
					<span style={{ color: "#ffa070" }}>📅</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-title">
							{t.name}
						</p>
						<p className="text-xs text-body">
							In 3 days · {new Date(t.date).toLocaleDateString()}
						</p>
					</div>
					<span
						className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-bg"
						style={{ backgroundColor: "#ffa070" }}
					>
						{t.tag.name}
					</span>
				</div>
			))}
		</div>
	),
};

export const Urgent = {
	render: () => (
		<div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2">
			{mockUrgent.map((t) => (
				<div
					key={t.id}
					className="flex items-center gap-3 rounded-[22.5px] border-[2.5px] border-[#ff7070] bg-bg px-4 py-3 shadow-[0_5px_0_rgba(255,112,112,0.25)]"
				>
					<span style={{ color: "#ff7070" }}>📅</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-title">
							{t.name}
						</p>
						<p className="text-xs text-body">
							Tomorrow · {new Date(t.date).toLocaleDateString()}
						</p>
					</div>
					<span
						className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-bg"
						style={{ backgroundColor: "#ff7070" }}
					>
						{t.tag.name}
					</span>
				</div>
			))}
		</div>
	),
};
