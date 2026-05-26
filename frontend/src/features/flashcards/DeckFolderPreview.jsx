import Icon from "../../components/Icon.jsx";
import { folderHex } from "../../lib/constants.js";

// Static folder row — used as the drag placeholder and the drag overlay,
// so a held folder keeps a fixed height instead of stretching.
export default function DeckFolderPreview({ folder, dimmed = false }) {
	return (
		<div
			className={`flex min-h-[45px] items-center gap-3 rounded-[22px] bg-bg px-4 py-2 ${
				dimmed ? "opacity-40" : "shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
			}`}
		>
			<Icon
				name="folder"
				size={20}
				style={{ color: folderHex(folder.color) }}
			/>
			<span className="flex-1 truncate font-semibold text-title">
				{folder.name}
			</span>
			<Icon name="chevron" size={12} className="text-body" />
		</div>
	);
}
