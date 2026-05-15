import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import ContextMenu from "../../components/ContextMenu.jsx";
import Icon from "../../components/Icon.jsx";
import { useContextMenu } from "../../hooks/useContextMenu.js";
import { folderHex } from "../../lib/constants.js";
import FolderModal from "./FolderModal.jsx";
import FolderPreview from "./FolderPreview.jsx";
import { useNotes } from "./NotesContext.jsx";
import PageList from "./PageList.jsx";

export default function FolderItem({ folder }) {
	const { pages, toggleCollapsed, removeFolder, addPage } = useNotes();
	const { menu, open, close } = useContextMenu();
	const [editing, setEditing] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: folder.id,
		data: { type: "folder" },
	});

	const folderPages = pages.filter((p) => p.folderId === folder.id);

	// While held, render a fixed-height placeholder; the drag overlay
	// (in FolderList) shows the moving copy.
	if (isDragging) {
		return (
			<div ref={setNodeRef} style={{ transition }}>
				<FolderPreview folder={folder} dimmed />
			</div>
		);
	}

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<div
				className={`rounded-[22px] bg-bg ${folder.collapsed ? "" : "pb-2"}`}
				onContextMenu={open}
			>
				<div
					className="flex min-h-[45px] cursor-pointer items-center gap-3 px-4 py-2"
					onClick={() => toggleCollapsed(folder.id)}
					{...attributes}
					{...listeners}
				>
					<Icon
						name="folder"
						size={20}
						style={{ color: folderHex(folder.color) }}
					/>
					<span className="flex-1 truncate font-semibold text-title">
						{folder.name}
					</span>
					{!folder.collapsed && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								addPage(folder.id);
							}}
							className="font-medium text-folder-blue"
						>
							Add page
						</button>
					)}
					<Icon
						name="chevron"
						size={12}
						className="text-body transition-transform"
						style={{ transform: folder.collapsed ? "none" : "rotate(90deg)" }}
					/>
				</div>

				{!folder.collapsed &&
					(folderPages.length > 0 ? (
						<PageList pages={folderPages} />
					) : (
						<p className="px-4 py-2 text-sm text-body">No pages yet.</p>
					))}
			</div>

			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					items={[
						{
							label: "Edit folder",
							icon: "folder",
							onClick: () => {
								setEditing(true);
								close();
							},
						},
						{
							label: "Delete folder",
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

			{editing && (
				<FolderModal folder={folder} onClose={() => setEditing(false)} />
			)}

			{confirming && (
				<ConfirmDialog
					title="Delete folder?"
					message={`"${folder.name}" and all its pages will be deleted.`}
					onConfirm={() => {
						removeFolder(folder.id);
						setConfirming(false);
					}}
					onCancel={() => setConfirming(false)}
				/>
			)}
		</div>
	);
}
