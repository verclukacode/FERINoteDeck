import checkmark from "../assets/icons/checkmark.svg?raw";
import chevron from "../assets/icons/chevron.svg?raw";
import document from "../assets/icons/document.svg?raw";
import flashcards from "../assets/icons/flashcards.svg?raw";
import folder from "../assets/icons/folder.svg?raw";
import paperplane from "../assets/icons/paperplane.svg?raw";
import party from "../assets/icons/party.svg?raw";
import plus from "../assets/icons/plus.svg?raw";
import search from "../assets/icons/search.svg?raw";
import store from "../assets/icons/store.svg?raw";
import studyHat from "../assets/icons/studt_hat.svg?raw";
import trash from "../assets/icons/trash.svg?raw";
import xmark from "../assets/icons/xmark.svg?raw";

const ICONS = {
	checkmark,
	chevron,
	document,
	flashcards,
	folder,
	paperplane,
	party,
	plus,
	search,
	store,
	"study-hat": studyHat,
	trash,
	xmark,
};

export default function Icon({ name, size = 16, className = "", style }) {
	const markup = ICONS[name];
	if (!markup) return null;
	return (
		<span
			className={`inline-flex items-center justify-center ${className}`}
			style={{ width: size, height: size, ...style }}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: bundled local SVG assets
			dangerouslySetInnerHTML={{ __html: markup }}
		/>
	);
}
