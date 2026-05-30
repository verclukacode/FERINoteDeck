import userProfilePic from "../../assets/userProfilePic.svg";
import Icon from "../../components/Icon.jsx";
import { useNotes } from "./NotesContext.jsx";

export default function SharedPageItem({ page }) {
	const { selectedPageId, selectPage } = useNotes();
	const selected = selectedPageId === page.id;
	const ownerName =
		page._owner?.username ?? page._owner?.email?.split("@")[0] ?? "Unknown";

	return (
		<button
			type="button"
			onClick={() => selectPage(page.id)}
			className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-2 text-left ${
				selected
					? "font-semibold text-title underline"
					: "font-medium text-body hover:bg-bg"
			}`}
		>
			<Icon name="document" size={20} />
			<span className="min-w-0 flex-1 truncate">{page.title}</span>
			<img
				src={page._owner?.avatarUrl ?? userProfilePic}
				alt={ownerName}
				title={`Shared by ${ownerName}`}
				className="h-5 w-5 shrink-0 rounded-full border border-border-soft object-cover"
			/>
		</button>
	);
}
