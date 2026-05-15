import Icon from "../../components/Icon.jsx";

// Static page row — used as the drag placeholder and the drag overlay.
export default function PagePreview({ page, dimmed = false }) {
	return (
		<div
			className={`flex items-center gap-3 rounded-lg px-4 py-2 ${
				dimmed ? "opacity-40" : "bg-bg shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
			}`}
		>
			<Icon name="document" size={20} />
			<span className="truncate font-medium text-body">{page.title}</span>
		</div>
	);
}
