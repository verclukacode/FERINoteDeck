import userProfilePic from "../../assets/userProfilePic.svg";
import Icon from "../../components/Icon.jsx";

// One row in the marketplace list. Shows the kind, title, public description,
// and author identity (avatar + username only — never email).
export default function MarketplaceCard({ item, selected, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full flex-col gap-2 rounded-2xl border-[2.5px] p-4 text-left transition-colors ${
				selected
					? "border-folder-blue bg-folder-blue/10"
					: "border-border-soft bg-bg hover:bg-bg-secondary"
			}`}
		>
			<div className="flex items-center gap-2">
				<Icon
					name={item.kind === "note" ? "document" : "flashcards"}
					size={18}
					className="shrink-0 text-body"
				/>
				<span className="flex-1 truncate font-semibold text-title">
					{item.title}
				</span>
			</div>
			{item.publicDescription && (
				<p className="line-clamp-2 text-sm text-body">
					{item.publicDescription}
				</p>
			)}
			<div className="mt-1 flex items-center gap-2">
				<img
					src={item.author?.avatarUrl ?? userProfilePic}
					alt=""
					width={24}
					height={24}
					className="h-6 w-6 rounded-full object-cover"
				/>
				<span className="truncate text-xs font-medium text-body">
					@{item.author?.username ?? "anonymous"}
				</span>
			</div>
		</button>
	);
}
