import { expect, fn, userEvent, within } from "storybook/test";
import Modal from "./Modal.jsx";

export default {
	title: "Components/Modal",
	component: Modal,
	parameters: { layout: "fullscreen" },
	args: {
		open: true,
		onClose: fn(),
	},
};

export const Default = {
	args: {
		children: (
			<>
				<h2 style={{ fontWeight: "bold", fontSize: 20 }}>Modal title</h2>
				<p style={{ marginTop: 8, color: "#666" }}>
					This is the modal body content.
				</p>
			</>
		),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const backdrop = canvas.getByRole("button", { name: /close/i });
		await userEvent.click(backdrop);
		await expect(args.onClose).toHaveBeenCalledTimes(1);
	},
};
