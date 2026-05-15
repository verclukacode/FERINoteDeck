import Icon from "../../components/Icon.jsx";

export default function UserProfileRow() {
	return (
		<div className="flex items-center gap-3 border-t-2 border-border-soft px-5 py-4">
			<div className="flex h-[50px] w-[50px] items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-body">
				<Icon name="study-hat" size={24} />
			</div>
			<span className="font-medium text-title">example@mail.com</span>
		</div>
	);
}
