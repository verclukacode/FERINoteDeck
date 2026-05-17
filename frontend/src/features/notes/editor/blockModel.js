import { createId } from "../../../lib/id.js";

export const BLOCK_TYPES = [
	"h1",
	"h2",
	"text",
	"bullet",
	"numbered",
	"task",
	"image",
	"separator",
];

// Types that hold list-style content (Enter/Backspace behave specially).
export const LIST_TYPES = ["bullet", "numbered", "task"];

// Types whose content supports inline bold + auto-linked URLs.
export const INLINE_TYPES = ["text", "bullet", "numbered", "task"];

export function createBlock(type = "text", content = "") {
	return { id: createId(), type, content, checked: false, imageUrl: "" };
}
