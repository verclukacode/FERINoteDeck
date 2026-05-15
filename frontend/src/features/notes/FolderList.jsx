import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCorners,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import FolderItem from "./FolderItem.jsx";
import FolderPreview from "./FolderPreview.jsx";
import { useNotes } from "./NotesContext.jsx";
import PagePreview from "./PagePreview.jsx";

// One DndContext drives both folder reordering and page drag-and-drop
// (within a folder and across folders).
function describe(node) {
	return { id: node?.id, type: node?.data?.current?.type };
}

export default function FolderList() {
	const { folders, pages, handleDndOver, handleDndEnd } = useNotes();
	const [active, setActive] = useState(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	const onDragStart = ({ active: node }) => {
		setActive(describe(node));
	};

	const onDragOver = ({ active: a, over }) => {
		if (!over) return;
		const from = describe(a);
		const to = describe(over);
		handleDndOver({
			activeId: from.id,
			activeType: from.type,
			overId: to.id,
			overType: to.type,
		});
	};

	const onDragEnd = ({ active: a, over }) => {
		const from = describe(a);
		const to = describe(over);
		handleDndEnd({
			activeId: from.id,
			activeType: from.type,
			overId: to.id,
			overType: to.type,
		});
		setActive(null);
	};

	const activeFolder =
		active?.type === "folder" ? folders.find((f) => f.id === active.id) : null;
	const activePage =
		active?.type === "page" ? pages.find((p) => p.id === active.id) : null;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragEnd={onDragEnd}
			onDragCancel={() => setActive(null)}
		>
			<SortableContext
				items={folders.map((f) => f.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="flex flex-col gap-2">
					{folders.map((folder) => (
						<FolderItem key={folder.id} folder={folder} />
					))}
				</div>
			</SortableContext>

			<DragOverlay>
				{activeFolder && <FolderPreview folder={activeFolder} />}
				{activePage && <PagePreview page={activePage} />}
			</DragOverlay>
		</DndContext>
	);
}
