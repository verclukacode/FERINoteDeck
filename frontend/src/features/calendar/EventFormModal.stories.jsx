import { expect, fn, userEvent, within } from "storybook/test";
import { CalendarContext } from "./CalendarContext.jsx";
import EventFormModal from "./EventFormModal.jsx";

const mockTags = [
	{ id: "tag-1", name: "Exam", color: "red" },
	{ id: "tag-2", name: "Assignment", color: "blue" },
	{ id: "tag-3", name: "Lab", color: "green" },
];

const mockContext = {
	tags: mockTags,
	events: [],
	loading: false,
	addTag: fn(async ({ name, color }) => ({ id: "tag-new", name, color })),
	editTag: fn(),
	removeTag: fn(),
	addEvent: fn(async (data) => ({ id: "evt-new", ...data, tag: null })),
	editEvent: fn(),
	removeEvent: fn(),
	refreshEvents: fn(),
};

export default {
	title: "Calendar/EventFormModal",
	component: EventFormModal,
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

export const CreateNew = {
	args: { event: null },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.type(canvas.getByLabelText(/name/i), "Final Exam");
		const dateInput = canvasElement.querySelector("input[type='date']");
		await userEvent.type(dateInput, "2026-06-15");
		await userEvent.click(canvas.getByRole("button", { name: /create/i }));
		await expect(mockContext.addEvent).toHaveBeenCalled();
	},
};

export const EditExisting = {
	args: {
		event: {
			id: "evt-1",
			name: "Math Midterm",
			description: "Chapters 1-5",
			date: "2026-06-10T10:00:00.000Z",
			tagId: "tag-1",
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByDisplayValue("Math Midterm")).toBeTruthy();
	},
};

export const WithNewTagCreation = {
	args: { event: null },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: /\+ new tag/i }));
		await expect(canvas.getByPlaceholderText(/tag name/i)).toBeTruthy();
	},
};
