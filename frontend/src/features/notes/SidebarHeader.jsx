import logo from "../../assets/Logo.png";
import Icon from "../../components/Icon.jsx";
import Pill from "../../components/Pill.jsx";
import ViewToggle from "./ViewToggle.jsx";

export default function SidebarHeader() {
	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-3 border-b-2 border-border-soft px-5 py-4">
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
						className="flex h-9 w-9 items-center justify-center text-title"
					>
						<Icon name="store" size={18} />
					</button>
					<button
						type="button"
						className="flex h-9 w-9 items-center justify-center text-title"
					>
						<Icon name="search" size={18} />
					</button>
				</Pill>
			</div>
		</div>
	);
}
