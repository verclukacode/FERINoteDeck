import { useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { useNotes } from "./NotesContext.jsx";
import BlockEditor from "./editor/BlockEditor.jsx";

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
	const { selectedPage, renamePage, updatePageContent } = useNotes();
	const editorRef = useRef(null);
	const [dirty, setDirty] = useState(false);

	if (!selectedPage) {
		return (
			<div className="flex flex-1 items-center justify-center text-body">
				Select a page to open it.
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col">
			<div className="flex h-[88px] items-center gap-4 border-b-2 border-border-soft px-5">
				<TitleField
					key={selectedPage.id}
					page={selectedPage}
					onRename={renamePage}
				/>
				<div className="flex items-center gap-2.5">
					<button
						type="button"
						disabled={!dirty}
						onClick={() => editorRef.current?.save()}
						className={`flex h-[45px] items-center rounded-full border-[2.5px] px-5 text-[15px] font-semibold ${
							dirty
								? "border-folder-blue/15 bg-folder-blue/15 text-folder-blue"
								: "cursor-default border-border-soft bg-bg text-body/40"
						}`}
					>
						{dirty ? "Save" : "Saved"}
					</button>
					<button
						type="button"
						className="flex h-[45px] w-[45px] items-center justify-center rounded-full border-[2.5px] border-border-soft bg-bg text-title"
					>
						<Icon name="paperplane" size={20} />
					</button>
					<button
						type="button"
						className="flex h-[45px] items-center gap-2 rounded-full border-[2.5px] border-folder-purple/15 bg-folder-purple/15 px-5 text-[15px] font-semibold text-folder-purple"
					>
						<Icon name="flashcards" size={20} />
						Create Flashcards
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto py-6">
				<BlockEditor
					key={selectedPage.id}
					ref={editorRef}
					page={selectedPage}
					onChange={updatePageContent}
					onDirtyChange={setDirty}
				/>
			</div>
		</div>
	);
}
