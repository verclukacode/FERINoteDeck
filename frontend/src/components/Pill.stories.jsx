import { expect, within } from "storybook/test";
import Icon from "./Icon.jsx";
import Pill from "./Pill.jsx";

export default {
	title: "Components/Pill",
	component: Pill,
};

export const TextOnly = {
	args: {
		children: "Note",
		className: "px-2 py-0.5 text-xs font-medium text-title",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("Note")).toBeInTheDocument();
	},
};

export const WithIcon = {
	render: () => (
		<Pill className="px-2 py-0.5 text-xs font-medium text-title">
			<Icon name="document" size={12} />
			Note
		</Pill>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("Note")).toBeInTheDocument();
		await expect(canvasElement.querySelector("svg")).not.toBeNull();
	},
};

export const Variants = {
	render: () => (
		<div style={{ display: "flex", gap: 8 }}>
			<Pill className="px-2 py-0.5 text-xs font-medium text-title">
				<Icon name="document" size={12} />
				Note
			</Pill>
			<Pill className="px-2 py-0.5 text-xs font-medium text-title">
				<Icon name="flashcards" size={12} />
				Deck
			</Pill>
			<Pill className="px-2 py-0.5 text-xs font-medium text-title">
				<Icon name="checkbox" size={12} />
				Card
			</Pill>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("Note")).toBeInTheDocument();
		await expect(canvas.getByText("Deck")).toBeInTheDocument();
		await expect(canvas.getByText("Card")).toBeInTheDocument();
	},
};
