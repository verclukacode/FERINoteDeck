import logo from "../../assets/Logo.png";
import Icon from "../../components/Icon.jsx";
import Pill from "../../components/Pill.jsx";
import { useNotes } from "./NotesContext.jsx";
import ViewToggle from "./ViewToggle.jsx";

export default function SidebarHeader({ onOpenMarketplace, onOpenSearch, onOpenNotifications }) {
	const { pendingInvites } = useNotes();
	const badgeCount = pendingInvites.length;

	return (
		<div className="flex flex-col">
			<div className="flex h-[88px] items-center gap-3 border-b-2 border-border-soft px-5">
				<img
					src={logo}
					alt="NoteDeck"
					className="h-[53px] w-[53px] rounded-[15px] outline-[2.5px] outline-[rgba(255,255,255,0.5)] [outline-offset:-2.5px]"
				/>
				<span className="text-xl font-bold text-title">NoteDeck</span>
			</div>
			<div className="flex items-center justify-between px-5 py-4">
				<ViewToggle />
				<Pill className="h-[45px] px-2">
					<button
						type="button"
						onClick={onOpenMarketplace}
						aria-label="Open marketplace"
						className="flex h-9 w-9 items-center justify-center text-title"
					>
						<Icon name="store" size={18} />
					</button>
					<button
						type="button"
						onClick={onOpenNotifications}
						aria-label="Notifications"
						className="relative flex h-9 w-9 items-center justify-center text-title"
					>
						<Icon name="bell" size={18} />
						{badgeCount > 0 && (
							<span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-folder-red text-[9px] font-bold text-white">
								{badgeCount}
							</span>
						)}
					</button>
					<button
						type="button"
						onClick={onOpenSearch}
						aria-label="Search"
						className="flex h-9 w-9 items-center justify-center text-title"
					>
						<Icon name="search" size={18} />
					</button>
				</Pill>
			</div>
		</div>
	);
}
