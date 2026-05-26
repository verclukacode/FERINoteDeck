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
import DeckFolderItem from "./DeckFolderItem.jsx";
import DeckFolderPreview from "./DeckFolderPreview.jsx";
import DeckPreview from "./DeckPreview.jsx";
import FlashcardFolderModal from "./FlashcardFolderModal.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";

// One DndContext drives both folder reordering and deck drag-and-drop
// (within a folder and across folders).
function describe(node) {
	return { id: node?.id, type: node?.data?.current?.type };
}

export default function DeckList() {
	const { folders, decks, loading, handleDndOver, handleDndEnd } =
		useFlashcards();
	const [adding, setAdding] = useState(false);
	const [active, setActive] = useState(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center text-body">
				Loading…
			</div>
		);
	}

	const onDragStart = ({ active: node }) => setActive(describe(node));

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
	const activeDeck =
		active?.type === "deck" ? decks.find((d) => d.id === active.id) : null;

	return (
		<>
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
							<DeckFolderItem key={folder.id} folder={folder} />
						))}
					</div>
				</SortableContext>

				<DragOverlay>
					{activeFolder && <DeckFolderPreview folder={activeFolder} />}
					{activeDeck && <DeckPreview deck={activeDeck} />}
				</DragOverlay>
			</DndContext>

			<button
				type="button"
				onClick={() => setAdding(true)}
				className="min-h-[45px] w-full rounded-[22px] border-2 border-dashed border-body/40 font-semibold text-title"
			>
				Add folder
			</button>
			{adding && <FlashcardFolderModal onClose={() => setAdding(false)} />}
		</>
	);
}
