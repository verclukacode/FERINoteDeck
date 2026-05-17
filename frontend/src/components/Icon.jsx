import checkbox from "../assets/icons/checkbox.svg?raw";
import checkmark from "../assets/icons/checkmark.svg?raw";
import chevron from "../assets/icons/chevron.svg?raw";
import divider from "../assets/icons/divider.svg?raw";
import document from "../assets/icons/document.svg?raw";
import flashcards from "../assets/icons/flashcards.svg?raw";
import folder from "../assets/icons/folder.svg?raw";
import heading1 from "../assets/icons/heading1.svg?raw";
import heading2 from "../assets/icons/heading2.svg?raw";
import image from "../assets/icons/image.svg?raw";
import listBullet from "../assets/icons/list-bullet.svg?raw";
import listNumbered from "../assets/icons/list-numbered.svg?raw";
import paperplane from "../assets/icons/paperplane.svg?raw";
import party from "../assets/icons/party.svg?raw";
import plus from "../assets/icons/plus.svg?raw";
import search from "../assets/icons/search.svg?raw";
import store from "../assets/icons/store.svg?raw";
import studyHat from "../assets/icons/studt_hat.svg?raw";
import text from "../assets/icons/text.svg?raw";
import trash from "../assets/icons/trash.svg?raw";
import xmark from "../assets/icons/xmark.svg?raw";

const ICONS = {
	checkbox,
	checkmark,
	chevron,
	divider,
	document,
	flashcards,
	folder,
	heading1,
	heading2,
	image,
	"list-bullet": listBullet,
	"list-numbered": listNumbered,
	paperplane,
	party,
	plus,
	search,
	store,
	"study-hat": studyHat,
	text,
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
