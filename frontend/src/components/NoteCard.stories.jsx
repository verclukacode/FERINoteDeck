import NoteCard from "./NoteCard";

export default {
	title: "Components/NoteCard",
	component: NoteCard,
	tags: ["autodocs"],
};

export const WithContent = {
	args: {
		id: 1,
		title: "Meeting notes",
		content: "Discuss project milestones and assign tasks to team members.",
		onDelete: undefined,
	},
};

export const TitleOnly = {
	args: {
		id: 2,
		title: "Buy groceries",
		content: "",
		onDelete: undefined,
	},
};

export const WithDeleteButton = {
	args: {
		id: 3,
		title: "Deletable note",
		content: "Click the delete button to remove this note.",
		onDelete: (id) => alert(`Delete note ${id}`),
	},
};
