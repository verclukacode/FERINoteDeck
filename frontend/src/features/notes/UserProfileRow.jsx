import Icon from "../../components/Icon.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNotes } from "./NotesContext.jsx";

export default function UserProfileRow() {
	const { user } = useAuth();
	const { setAccountOpen } = useNotes();

	return (
		<button
			type="button"
			onClick={() => setAccountOpen(true)}
			className="flex w-full items-center gap-3 border-t-2 border-border-soft px-5 py-4 hover:bg-bg-secondary"
		>
			<div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-body">
				<Icon name="study-hat" size={24} />
			</div>
			<span className="min-w-0 flex-1 truncate text-left font-medium text-title">
				{user?.email ?? ""}
			</span>
			<Icon name="chevron" size={14} className="shrink-0 rotate-90 text-body" />
		</button>
	);
}
