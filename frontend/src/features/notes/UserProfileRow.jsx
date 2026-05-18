import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function UserProfileRow() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	function handleLogout() {
		logout();
		navigate("/login", { replace: true });
	}

	return (
		<div className="flex items-center gap-3 border-t-2 border-border-soft px-5 py-4">
			<div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-body">
				<Icon name="study-hat" size={24} />
			</div>
			<span className="min-w-0 flex-1 truncate font-medium text-title">
				{user?.email ?? ""}
			</span>
			<button
				type="button"
				onClick={handleLogout}
				title="Log out"
				className="shrink-0 text-xl leading-none"
			>
				🚪
			</button>
		</div>
	);
}
