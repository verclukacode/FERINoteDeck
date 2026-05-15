import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNotes } from "./NotesContext.jsx";
import PageItem from "./PageItem.jsx";

export default function PageList({ pages }) {
	const { selectedPageId, selectPage } = useNotes();

	return (
		<SortableContext
			items={pages.map((p) => p.id)}
			strategy={verticalListSortingStrategy}
		>
			<div className="flex flex-col gap-0.5">
				{pages.map((page) => (
					<PageItem
						key={page.id}
						page={page}
						selected={page.id === selectedPageId}
						onSelect={() => selectPage(page.id)}
					/>
				))}
			</div>
		</SortableContext>
	);
}
