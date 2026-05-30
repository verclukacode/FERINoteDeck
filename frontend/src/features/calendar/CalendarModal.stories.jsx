import { expect, fn, userEvent, within } from "storybook/test";
import { CalendarContext } from "./CalendarContext.jsx";
import CalendarModal from "./CalendarModal.jsx";

const today = new Date();
const addDays = (n) =>
	new Date(today.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const mockTags = [
	{ id: "tag-1", name: "Exam", color: "red" },
	{ id: "tag-2", name: "Assignment", color: "blue" },
	{ id: "tag-3", name: "Lab", color: "green" },
];

const mockEvents = [
	{
		id: "evt-1",
		name: "Math Final Exam",
		description: "Chapters 1 through 7",
		date: addDays(1),
		tagId: "tag-1",
		tag: mockTags[0],
	},
	{
		id: "evt-2",
		name: "Physics Assignment",
		description: null,
		date: addDays(2),
		tagId: "tag-2",
		tag: mockTags[1],
	},
	{
		id: "evt-3",
		name: "Lab Report",
		description: "Submit to Moodle",
		date: addDays(5),
		tagId: "tag-3",
		tag: mockTags[2],
	},
	{
		id: "evt-4",
		name: "Past Quiz",
		description: null,
		date: addDays(-3),
		tagId: "tag-1",
		tag: mockTags[0],
	},
];

const mockContext = {
	tags: mockTags,
	events: mockEvents,
	loading: false,
	addTag: fn(async ({ name, color }) => ({ id: "tag-new", name, color })),
	editTag: fn(),
	removeTag: fn(),
	addEvent: fn(async (data) => ({ id: "evt-new", ...data, tag: null })),
	editEvent: fn(),
	removeEvent: fn(async () => {}),
	refreshEvents: fn(),
};

export default {
	title: "Calendar/CalendarModal",
	component: CalendarModal,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			<CalendarContext.Provider value={mockContext}>
				<Story />
			</CalendarContext.Provider>
		),
	],
	args: {
		onClose: fn(),
	},
};

export const Default = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Calendar header is visible
		await expect(canvas.getByText("Calendar")).toBeTruthy();
		// Events are listed
		await expect(canvas.getByText("Math Final Exam")).toBeTruthy();
	},
};

export const WeekView = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: /week/i }));
		// Week view shows day abbreviations
		await expect(canvas.getByText("Mon")).toBeTruthy();
	},
};

export const TagFilter = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Click "Exam" tag filter
		const examBtns = canvas.getAllByText("Exam");
		await userEvent.click(examBtns[0]);
		// Lab Report should not be visible (different tag)
		const labItems = canvasElement.querySelectorAll('[class*="EventItem"]');
		await expect(canvas.queryByText("Lab Report")).toBeNull();
	},
};

export const ShowPast = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Past events hidden by default
		await expect(canvas.queryByText("Past Quiz")).toBeNull();
		// Toggle show past
		await userEvent.click(canvas.getByRole("button", { name: /show past/i }));
		await expect(canvas.getByText("Past Quiz")).toBeTruthy();
	},
};
