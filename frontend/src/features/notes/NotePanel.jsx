import { useState } from "react";
import Icon from "../../components/Icon.jsx";
import { useNotes } from "./NotesContext.jsx";

// Editable page title — Enter (or blur) commits, empty input reverts.
function TitleField({ page, onRename }) {
	const [value, setValue] = useState(page.title);

	const commit = () => {
		const next = value.trim();
		if (next && next !== page.title) onRename(page.id, next);
		else setValue(page.title);
	};

	return (
		<input
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") e.currentTarget.blur();
			}}
			onBlur={commit}
			className="-mx-2 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-3xl font-bold text-title outline-none focus:bg-bg-secondary"
		/>
	);
}

export default function NotePanel() {
	const { selectedPage, renamePage } = useNotes();

	if (!selectedPage) {
		return (
			<div className="flex flex-1 items-center justify-center text-body">
				Select a page to open it.
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col">
			<div className="flex h-[88px] items-center gap-4 border-b-2 border-border-soft px-8">
				<TitleField
					key={selectedPage.id}
					page={selectedPage}
					onRename={renamePage}
				/>
				<div className="flex items-center gap-2.5">
					<button
						type="button"
						className="flex h-[45px] w-[45px] items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title"
					>
						<Icon name="paperplane" size={20} />
					</button>
					<button
						type="button"
						className="flex h-[45px] items-center gap-2 rounded-full border-[2.5px] border-folder-purple/15 bg-folder-purple/15 px-5 text-xl font-semibold text-folder-purple"
					>
						<Icon name="flashcards" size={20} />
						Create Flashcards
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto px-8 py-6" />
		</div>
	);
}
