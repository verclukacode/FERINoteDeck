import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCallback, useEffect, useRef, useState } from "react";
import BlockPreview from "./BlockPreview.jsx";
import EditorBlock from "./EditorBlock.jsx";
import SlashMenu from "./SlashMenu.jsx";
import { LIST_TYPES, createBlock, ensureTrailingBlock } from "./blockModel.js";
import { restoreCursor } from "./inlineFormat.js";
import { parse, serialize } from "./markdown.js";

const TEXT_BEARING = new Set([
	"text",
	"h1",
	"h2",
	"bullet",
	"numbered",
	"task",
]);
const isList = (type) => LIST_TYPES.includes(type);

export default function BlockEditor({ page, onChange }) {
	const [blocks, setBlocks] = useState(() =>
		ensureTrailingBlock(parse(page.content)),
	);
	const [focusedId, setFocusedId] = useState(null);
	const [menu, setMenu] = useState(null);
	const [activeId, setActiveId] = useState(null);
	const blockRefs = useRef({});
	const blocksRef = useRef(blocks);
	const firstRun = useRef(true);
	blocksRef.current = blocks;

	const registerRef = useCallback((id, el) => {
		if (el) blockRefs.current[id] = el;
		else delete blockRefs.current[id];
	}, []);

	const focusBlock = useCallback((id, pos) => {
		requestAnimationFrame(() => {
			const el = blockRefs.current[id];
			if (!el) return;
			el.focus();
			if (typeof pos === "number") {
				try {
					restoreCursor(el, pos);
				} catch {
					/* element has no text nodes yet */
				}
			}
		});
	}, []);

	// Debounced save: blocks -> markdown -> context.
	// biome-ignore lint/correctness/useExhaustiveDependencies: blocks triggers the save; the body reads blocksRef
	useEffect(() => {
		if (firstRun.current) {
			firstRun.current = false;
			return;
		}
		const timer = setTimeout(() => {
			onChange(page.id, serialize(blocksRef.current));
		}, 500);
		return () => clearTimeout(timer);
	}, [blocks, page.id, onChange]);

	// Flush on unmount so switching pages persists immediately.
	useEffect(() => {
		return () => onChange(page.id, serialize(blocksRef.current));
	}, [page.id, onChange]);

	const apply = (next) => {
		const normalized = ensureTrailingBlock(next);
		blocksRef.current = normalized;
		setBlocks(normalized);
	};

	const updateBlock = (id, patch) => {
		apply(blocksRef.current.map((b) => (b.id === id ? { ...b, ...patch } : b)));
	};

	const handleEnter = (id, { pos, len }) => {
		const prev = blocksRef.current;
		const idx = prev.findIndex((b) => b.id === id);
		if (idx < 0) return;
		const block = prev[idx];
		const cont = isList(block.type) ? block.type : "text";

		if (isList(block.type) && !block.content) {
			apply(prev.map((b, i) => (i === idx ? { ...b, type: "text" } : b)));
			focusBlock(id, 0);
			return;
		}
		if (block.type === "separator") {
			const nb = createBlock("text");
			const next = [...prev];
			next.splice(idx + 1, 0, nb);
			apply(next);
			focusBlock(nb.id, 0);
			return;
		}
		if (pos === 0 && block.content) {
			const next = [...prev];
			next.splice(idx, 0, createBlock(cont));
			apply(next);
			focusBlock(id, 0);
			return;
		}
		if (pos > 0 && pos < len) {
			const nb = createBlock(cont, block.content.slice(pos));
			const next = [...prev];
			next[idx] = { ...block, content: block.content.slice(0, pos) };
			next.splice(idx + 1, 0, nb);
			apply(next);
			focusBlock(nb.id, 0);
			return;
		}
		const nb = createBlock(cont);
		const next = [...prev];
		next.splice(idx + 1, 0, nb);
		apply(next);
		focusBlock(nb.id, 0);
	};

	const handleBackspaceAtStart = (id) => {
		const prev = blocksRef.current;
		const idx = prev.findIndex((b) => b.id === id);
		if (idx < 0) return;
		const block = prev[idx];
		const before = prev[idx - 1];

		if (isList(block.type)) {
			apply(prev.map((b, i) => (i === idx ? { ...b, type: "text" } : b)));
			focusBlock(id, 0);
			return;
		}
		if (block.type === "image" && block.content) return;
		if (block.type === "separator") {
			if (prev.length === 1) return;
			apply(prev.filter((_, i) => i !== idx));
			if (before) focusBlock(before.id, (before.content || "").length);
			return;
		}
		if (!block.content) {
			if (prev.length === 1) return;
			apply(prev.filter((_, i) => i !== idx));
			if (before) focusBlock(before.id, (before.content || "").length);
			return;
		}
		if (before && TEXT_BEARING.has(before.type)) {
			const joinPos = (before.content || "").length;
			const merged = (before.content || "") + block.content;
			apply(
				prev
					.map((b, i) => (i === idx - 1 ? { ...b, content: merged } : b))
					.filter((_, i) => i !== idx),
			);
			focusBlock(before.id, joinPos);
		}
	};

	const handleAutoFormat = (id, type, content) => {
		const prev = blocksRef.current;
		const idx = prev.findIndex((b) => b.id === id);
		if (idx < 0) return;
		if (type === "separator") {
			const nb = createBlock("text");
			const next = [...prev];
			next[idx] = { ...prev[idx], type: "separator", content: "" };
			next.splice(idx + 1, 0, nb);
			apply(next);
			focusBlock(nb.id, 0);
			return;
		}
		apply(prev.map((b, i) => (i === idx ? { ...b, type, content } : b)));
		focusBlock(id, 0);
	};

	const handleMove = (id, dir) => {
		const prev = blocksRef.current;
		const idx = prev.findIndex((b) => b.id === id);
		const j = idx + dir;
		if (idx < 0 || j < 0 || j >= prev.length) return;
		const next = [...prev];
		[next[idx], next[j]] = [next[j], next[idx]];
		apply(next);
		focusBlock(id);
	};

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const handleBlockDragEnd = ({ active, over }) => {
		setActiveId(null);
		if (!over || active.id === over.id) return;
		const prev = blocksRef.current;
		const from = prev.findIndex((b) => b.id === active.id);
		const to = prev.findIndex((b) => b.id === over.id);
		if (from < 0 || to < 0) return;
		apply(arrayMove(prev, from, to));
	};

	const handleSlash = (id) => {
		const el = blockRefs.current[id];
		const rect = el ? el.getBoundingClientRect() : { left: 120, bottom: 120 };
		setMenu({
			blockId: id,
			position: { left: rect.left, top: rect.bottom + 6 },
			canDelete: false,
		});
	};

	const handleOpenMenu = (id, rect) => {
		setMenu({
			blockId: id,
			position: { left: rect.left, top: rect.bottom + 6 },
			canDelete: true,
		});
	};

	const handleMenuSelect = (type) => {
		const id = menu?.blockId;
		setMenu(null);
		const prev = blocksRef.current;
		const idx = prev.findIndex((b) => b.id === id);
		if (idx < 0) return;
		if (type === "separator") {
			const nb = createBlock("text");
			const next = [...prev];
			next[idx] = { ...prev[idx], type: "separator", content: "" };
			next.splice(idx + 1, 0, nb);
			apply(next);
			focusBlock(nb.id, 0);
			return;
		}
		if (type === "image") {
			apply(
				prev.map((b, i) =>
					i === idx ? { ...b, type: "image", content: "", imageUrl: "" } : b,
				),
			);
			return;
		}
		apply(prev.map((b, i) => (i === idx ? { ...b, type } : b)));
		focusBlock(id, 0);
	};

	const handleMenuDelete = () => {
		const id = menu?.blockId;
		setMenu(null);
		const prev = blocksRef.current;
		const idx = prev.findIndex((b) => b.id === id);
		if (idx < 0) return;
		let next = prev.filter((_, i) => i !== idx);
		if (next.length === 0) next = [createBlock("text")];
		apply(next);
		const target = prev[idx - 1] || next[0];
		if (target) focusBlock(target.id, (target.content || "").length);
	};

	let numberRun = 0;
	const numberFor = (id) => {
		let run = 0;
		for (const b of blocks) {
			run = b.type === "numbered" ? run + 1 : 0;
			if (b.id === id) return run;
		}
		return 0;
	};
	const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

	return (
		<div className="w-full px-5 pb-24">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={({ active }) => setActiveId(active.id)}
				onDragEnd={handleBlockDragEnd}
				onDragCancel={() => setActiveId(null)}
			>
				<SortableContext
					items={blocks.map((b) => b.id)}
					strategy={verticalListSortingStrategy}
				>
					{blocks.map((block) => {
						numberRun = block.type === "numbered" ? numberRun + 1 : 0;
						return (
							<EditorBlock
								key={block.id}
								block={block}
								numberIndex={numberRun}
								showPlaceholder={block.id === focusedId || blocks.length === 1}
								registerRef={registerRef}
								onUpdate={(patch) => updateBlock(block.id, patch)}
								onEnter={(info) => handleEnter(block.id, info)}
								onBackspaceAtStart={() => handleBackspaceAtStart(block.id)}
								onSlash={() => handleSlash(block.id)}
								onMove={(dir) => handleMove(block.id, dir)}
								onAutoFormat={(type, content) =>
									handleAutoFormat(block.id, type, content)
								}
								onFocusChange={setFocusedId}
								onOpenMenu={(rect) => handleOpenMenu(block.id, rect)}
							/>
						);
					})}
				</SortableContext>
				<DragOverlay>
					{activeBlock && (
						<BlockPreview
							block={activeBlock}
							numberIndex={numberFor(activeBlock.id)}
						/>
					)}
				</DragOverlay>
			</DndContext>
			{menu && (
				<SlashMenu
					position={menu.position}
					onSelect={handleMenuSelect}
					onClose={() => setMenu(null)}
					onDelete={menu.canDelete ? handleMenuDelete : undefined}
				/>
			)}
		</div>
	);
}
