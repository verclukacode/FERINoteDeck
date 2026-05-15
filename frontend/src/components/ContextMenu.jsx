import Icon from "./Icon.jsx";

export default function ContextMenu({ x, y, items }) {
	return (
		<div
			className="fixed z-50 min-w-[180px] rounded-2xl border-[2.5px] border-border-soft bg-bg p-1.5 shadow-lg"
			style={{ top: y, left: x }}
		>
			{items.map((item) => (
				<button
					key={item.label}
					type="button"
					onClick={item.onClick}
					className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium hover:bg-bg-secondary ${
						item.danger ? "text-folder-red" : "text-title"
					}`}
				>
					{item.icon && <Icon name={item.icon} size={16} />}
					{item.label}
				</button>
			))}
		</div>
	);
}
