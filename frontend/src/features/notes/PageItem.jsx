import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import ContextMenu from "../../components/ContextMenu.jsx";
import Icon from "../../components/Icon.jsx";
import { useContextMenu } from "../../hooks/useContextMenu.js";
import { useNotes } from "./NotesContext.jsx";
import PagePreview from "./PagePreview.jsx";

export default function PageItem({ page, selected, onSelect }) {
	const { removePage } = useNotes();
	const { menu, open, close } = useContextMenu();
	const [confirming, setConfirming] = useState(false);
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: page.id,
		data: { type: "page", folderId: page.folderId },
	});

	if (isDragging) {
		return (
			<div ref={setNodeRef} style={{ transition }}>
				<PagePreview page={page} dimmed />
			</div>
		);
	}

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<>
			<button
				ref={setNodeRef}
				style={style}
				type="button"
				onClick={onSelect}
				onContextMenu={open}
				{...attributes}
				{...listeners}
				className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-2 text-left ${
					selected
						? "font-semibold text-title underline"
						: "font-medium text-body hover:bg-bg-secondary"
				}`}
			>
				<Icon name="document" size={20} />
				<span className="truncate">{page.title}</span>
			</button>

			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					items={[
						{
							label: "Delete page",
							icon: "trash",
							danger: true,
							onClick: () => {
								setConfirming(true);
								close();
							},
						},
					]}
				/>
			)}

			{confirming && (
				<ConfirmDialog
					title="Delete page?"
					message={`"${page.title}" will be deleted.`}
					onConfirm={() => {
						removePage(page.id);
						setConfirming(false);
					}}
					onCancel={() => setConfirming(false)}
				/>
			)}
		</>
	);
}
