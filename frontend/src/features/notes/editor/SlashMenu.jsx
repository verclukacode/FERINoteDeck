import { useState } from "react";
import Icon from "../../../components/Icon.jsx";

const ITEMS = [
	{ type: "text", label: "Text", icon: "text" },
	{ type: "h1", label: "Heading 1", icon: "heading1" },
	{ type: "h2", label: "Heading 2", icon: "heading2" },
	{ type: "bullet", label: "Bullet list", icon: "list-bullet" },
	{ type: "numbered", label: "Numbered list", icon: "list-numbered" },
	{ type: "task", label: "Checklist", icon: "checkbox" },
	{ type: "image", label: "Image", icon: "image" },
	{ type: "separator", label: "Separator", icon: "divider" },
];

export default function SlashMenu({ position, onSelect, onClose, onDelete }) {
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);

	const q = query.toLowerCase();
	const filtered = ITEMS.filter(
		(i) => i.label.toLowerCase().includes(q) || i.type.includes(q),
	);

	const choose = (item) => item && onSelect(item.type);

	const onKeyDown = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((i) => Math.min(i + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			choose(filtered[active]);
		} else if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		}
	};

	return (
		<>
			<button
				type="button"
				aria-label="Close menu"
				onClick={onClose}
				className="fixed inset-0 z-40 cursor-default"
			/>
			<div
				className="fixed z-50 w-[240px] rounded-2xl border-[2.5px] border-border-soft bg-bg p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
				style={{ left: position.left, top: position.top }}
			>
				<input
					// biome-ignore lint/a11y/noAutofocus: menu opens on demand and needs the caret
					autoFocus
					value={query}
					placeholder="Filter blocks..."
					onChange={(e) => {
						setQuery(e.target.value);
						setActive(0);
					}}
					onKeyDown={onKeyDown}
					className="mb-1 w-full rounded-lg bg-bg-secondary px-3 py-2 text-sm text-title outline-none"
				/>
				{filtered.map((item, idx) => (
					<button
						key={item.type}
						type="button"
						onMouseEnter={() => setActive(idx)}
						onClick={() => choose(item)}
						className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-title ${
							idx === active ? "bg-bg-secondary" : ""
						}`}
					>
						<Icon name={item.icon} size={18} />
						{item.label}
					</button>
				))}
				{filtered.length === 0 && (
					<p className="px-3 py-2 text-sm text-body">No blocks</p>
				)}
				{onDelete && (
					<>
						<div className="my-1 border-t-2 border-border-soft" />
						<button
							type="button"
							onClick={onDelete}
							className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-folder-red hover:bg-bg-secondary"
						>
							<Icon name="trash" size={18} />
							Delete block
						</button>
					</>
				)}
			</div>
		</>
	);
}
