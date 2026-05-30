import { expect, fn, userEvent, within } from "storybook/test";
import DuoButton from "./DuoButton.jsx";

export default {
	title: "Components/DuoButton",
	component: DuoButton,
	args: {
		children: "Click me",
		onClick: fn(),
	},
};

export const Primary = {
	args: {
		children: "Save",
		className:
			"h-[45px] w-[200px] bg-accent text-white shadow-[0_2.5px_0_#3a7bd5]",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button"));
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};

export const Danger = {
	args: {
		children: "Delete",
		className:
			"h-[45px] w-[200px] bg-folder-red text-bg shadow-[0_2.5px_0_#d95a5a]",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button"));
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};

export const Neutral = {
	args: {
		children: "Cancel",
		className:
			"h-[45px] w-[200px] bg-body text-white shadow-[0_2.5px_0_#5b5b5b]",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button"));
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};

export const Disabled = {
	args: {
		children: "Disabled",
		disabled: true,
		className:
			"h-[45px] w-[200px] bg-body text-white shadow-[0_2.5px_0_#5b5b5b] opacity-50 cursor-not-allowed",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const btn = canvas.getByRole("button");
		await expect(btn).toBeDisabled();
		await expect(args.onClick).not.toHaveBeenCalled();
	},
};
