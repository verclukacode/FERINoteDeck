import { expect, within } from "storybook/test";
import Icon from "./Icon.jsx";

export default {
	title: "Components/Icon",
	component: Icon,
	args: { size: 20 },
};

const ALL_NAMES = [
	"bell",
	"checkbox",
	"checkmark",
	"chevron",
	"divider",
	"document",
	"flashcards",
	"folder",
	"grip",
	"heading1",
	"heading2",
	"image",
	"list-bullet",
	"list-numbered",
	"paperplane",
	"party",
	"plus",
	"search",
	"store",
	"study-hat",
	"text",
	"trash",
	"xmark",
];

export const Single = {
	args: { name: "folder", size: 24 },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.getByRole("img", { hidden: true }) ??
				canvasElement.querySelector("svg"),
		).not.toBeNull();
	},
};

export const AllIcons = {
	render: (args) => (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16 }}>
			{ALL_NAMES.map((name) => (
				<div
					key={name}
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 4,
					}}
				>
					<Icon {...args} name={name} />
					<span style={{ fontSize: 10, color: "#888" }}>{name}</span>
				</div>
			))}
		</div>
	),
	args: { size: 24 },
	play: async ({ canvasElement }) => {
		const svgs = canvasElement.querySelectorAll("svg");
		await expect(svgs.length).toBe(ALL_NAMES.length);
	},
};
