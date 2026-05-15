export const FOLDER_COLORS = [
	{ key: "red", hex: "#ff7070" },
	{ key: "orange", hex: "#ffa070" },
	{ key: "pink", hex: "#ff70c3" },
	{ key: "green", hex: "#2fd5b1" },
	{ key: "blue", hex: "#499ef3" },
	{ key: "purple", hex: "#7092ff" },
];

export const DEFAULT_FOLDER_COLOR = "blue";

export function folderHex(colorKey) {
	const match = FOLDER_COLORS.find((c) => c.key === colorKey);
	return match ? match.hex : FOLDER_COLORS[0].hex;
}

export const STORAGE_KEYS = {
	folders: "notedeck.folders",
	pages: "notedeck.pages",
};

export const VIEW = {
	NOTES: "notes",
	FLASHCARDS: "flashcards",
};
