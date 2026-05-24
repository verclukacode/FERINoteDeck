import DeckFolderItem from "./DeckFolderItem.jsx";
import { useFlashcards } from "./FlashcardsContext.jsx";

export default function DeckList() {
	const { folders, addFolder, loading } = useFlashcards();

	if (loading) {
		return <div className="flex flex-1 items-center justify-center text-body">Loading…</div>;
	}

	return (
		<>
			<div className="flex flex-col gap-2">
				{folders.map((folder) => (
					<DeckFolderItem key={folder.id} folder={folder} />
				))}
			</div>
			<button
				type="button"
				onClick={addFolder}
				className="min-h-[45px] w-full rounded-[22px] border-2 border-dashed border-body/40 font-semibold text-title"
			>
				Add folder
			</button>
		</>
	);
}
