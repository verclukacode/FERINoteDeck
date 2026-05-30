import { expect, fn, userEvent, within } from "storybook/test";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default {
	title: "Components/ConfirmDialog",
	component: ConfirmDialog,
	parameters: { layout: "fullscreen" },
	args: {
		onConfirm: fn(),
		onCancel: fn(),
	},
};

export const Delete = {
	args: {
		title: "Delete folder?",
		message: "This will permanently delete the folder and all its notes.",
		confirmLabel: "Delete",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: /delete/i }));
		await expect(args.onConfirm).toHaveBeenCalledTimes(1);
		await expect(args.onCancel).not.toHaveBeenCalled();
	},
};

export const CustomLabel = {
	args: {
		title: "Reset deck?",
		message: "All scheduling progress will be lost. Review history is kept.",
		confirmLabel: "Reset",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: /cancel/i }));
		await expect(args.onCancel).toHaveBeenCalledTimes(1);
		await expect(args.onConfirm).not.toHaveBeenCalled();
	},
};
