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
import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
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

export default function BlockEditor({ page, onChange, onDirtyChange, ref }) {
	const [blocks, setBlocks] = useState(() =>
		ensureTrailingBlock(parse(page.content)),
	);
	const [focusedId, setFocusedId] = useState(null);
	const [menu, setMenu] = useState(null);
	const [activeId, setActiveId] = useState(null);
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	const [selectionRect, setSelectionRect] = useState(null);
	const blockRefs = useRef({});
	const blocksRef = useRef(blocks);
	const dirtyRef = useRef(false);
	const editorRef = useRef(null);
	const selectedIdsRef = useRef(selectedIds);
	blocksRef.current = blocks;
	selectedIdsRef.current = selectedIds;

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

	// Reset the dirty flag whenever a new page is opened.
	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount per page
	useEffect(() => {
		onDirtyChange?.(false);
	}, []);

	const save = useCallback(async () => {
		await onChange(page.id, serialize(blocksRef.current));
		dirtyRef.current = false;
		onDirtyChange?.(false);
	}, [onChange, page.id, onDirtyChange]);

	useImperativeHandle(ref, () => ({ save }), [save]);

	// Auto-save every 30s while there are unsaved changes.
	useEffect(() => {
		const timer = setInterval(() => {
			if (dirtyRef.current) save();
		}, 30000);
		return () => clearInterval(timer);
	}, [save]);

	// Flush unsaved changes when leaving the page (e.g. opening another note).
	useEffect(() => {
		return () => {
			if (dirtyRef.current) {
				onChange(page.id, serialize(blocksRef.current));
			}
		};
	}, [page.id, onChange]);

	const apply = (next) => {
		const normalized = ensureTrailingBlock(next);
		blocksRef.current = normalized;
		setBlocks(normalized);
		if (!dirtyRef.current) {
			dirtyRef.current = true;
			onDirtyChange?.(true);
		}
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

	// Two ways to start a multi-block selection:
	//  - drag inside a block — native text selection at first; if the drag
	//    crosses into another block, switch to block-selection mode (like FlowNote).
	//  - drag on empty editor space — marquee/rectangle selection.
	const handleEditorMouseDown = (e) => {
		if (e.button !== 0) return;
		if (e.target.closest("button, input, label")) return;

		const blockEl = e.target.closest("[data-block-id]");
		const findBlockByY = (y) => {
			const els = editorRef.current?.querySelectorAll("[data-block-id]");
			if (!els || els.length === 0) return null;
			for (const el of els) {
				const r = el.getBoundingClientRect();
				if (y <= r.bottom) return el.getAttribute("data-block-id");
			}
			return els[els.length - 1].getAttribute("data-block-id");
		};

		if (blockEl) {
			// Started inside a block — let the browser run text selection until
			// the drag crosses into another block, then take over.
			setSelectedIds(new Set());
			const originId = blockEl.getAttribute("data-block-id");
			let inBlockMode = false;

			const onMove = (ev) => {
				const overId = findBlockByY(ev.clientY);
				if (!inBlockMode && overId && overId !== originId) {
					inBlockMode = true;
				}
				if (!inBlockMode) return;
				window.getSelection()?.removeAllRanges();
				document.activeElement?.blur?.();
				const arr = blocksRef.current;
				const a = arr.findIndex((b) => b.id === originId);
				const b = arr.findIndex((b) => b.id === overId);
				if (a < 0 || b < 0) return;
				const lo = Math.min(a, b);
				const hi = Math.max(a, b);
				const ids = new Set();
				for (let i = lo; i <= hi; i++) ids.add(arr[i].id);
				setSelectedIds(ids);
			};
			const onUp = () => {
				window.removeEventListener("mousemove", onMove);
				window.removeEventListener("mouseup", onUp);
				if (inBlockMode) window.getSelection()?.removeAllRanges();
			};
			window.addEventListener("mousemove", onMove);
			window.addEventListener("mouseup", onUp);
			return;
		}

		if (e.target.closest("[contenteditable]")) return;

		document.activeElement?.blur?.();
		const start = { x: e.clientX, y: e.clientY };
		setSelectionRect({ x: start.x, y: start.y, w: 0, h: 0 });
		setSelectedIds(new Set());

		const onMove = (ev) => {
			const x1 = Math.min(start.x, ev.clientX);
			const y1 = Math.min(start.y, ev.clientY);
			const x2 = Math.max(start.x, ev.clientX);
			const y2 = Math.max(start.y, ev.clientY);
			setSelectionRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
			const next = new Set();
			const els = editorRef.current?.querySelectorAll("[data-block-id]") ?? [];
			for (const el of els) {
				const r = el.getBoundingClientRect();
				if (r.left < x2 && r.right > x1 && r.top < y2 && r.bottom > y1) {
					next.add(el.getAttribute("data-block-id"));
				}
			}
			setSelectedIds(next);
		};
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			setSelectionRect(null);
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	};

	const bulkDelete = (ids) => {
		if (!ids.length) return;
		const idSet = new Set(ids);
		const prev = blocksRef.current;
		let next = prev.filter((b) => !idSet.has(b.id));
		if (next.length === 0) next = [createBlock("text")];
		apply(next);
		setSelectedIds(new Set());
	};

	const bulkTransform = (ids, type) => {
		const idSet = new Set(ids);
		const prev = blocksRef.current;
		const next = prev.map((b) => {
			if (!idSet.has(b.id)) return b;
			if (type === "separator") return { ...b, type, content: "" };
			if (type === "image") return { ...b, type, content: "", imageUrl: "" };
			return { ...b, type };
		});
		apply(next);
	};

	// Paste markdown as a sequence of blocks after `afterId` (or replacing it
	// when it's an empty text block).
	const handlePasteBlocks = (afterId, text) => {
		const incoming = parse(text);
		if (incoming.length === 0) return;
		const prev = blocksRef.current;
		const idx = prev.findIndex((b) => b.id === afterId);
		if (idx < 0) return;
		const current = prev[idx];
		const replaceCurrent = current.type === "text" && !current.content;
		const next = replaceCurrent
			? [...prev.slice(0, idx), ...incoming, ...prev.slice(idx + 1)]
			: [...prev.slice(0, idx + 1), ...incoming, ...prev.slice(idx + 1)];
		apply(next);
		const last = incoming[incoming.length - 1];
		if (last) focusBlock(last.id, (last.content || "").length);
	};

	// Copy / cut a multi-block selection as markdown to the clipboard.
	// biome-ignore lint/correctness/useExhaustiveDependencies: handler reads refs; bind once
	useEffect(() => {
		const isEditingTarget = () => {
			const ae = document.activeElement;
			if (!ae) return false;
			if (ae.isContentEditable) return true;
			return ae.tagName === "INPUT" || ae.tagName === "TEXTAREA";
		};
		const serializeSelection = () => {
			const ids = selectedIdsRef.current;
			if (ids.size === 0) return null;
			const chosen = blocksRef.current.filter((b) => ids.has(b.id));
			if (chosen.length === 0) return null;
			// Strip the <<<NoteDeckMD>>> wrapper lines so the clipboard text is
			// clean markdown (parse() tolerates its absence on paste-back).
			const md = serialize(chosen);
			return md.split("\n").slice(1, -1).join("\n");
		};
		const onCopy = (e) => {
			if (isEditingTarget()) {
				const ws = window.getSelection();
				if (ws && !ws.isCollapsed) return;
			}
			const text = serializeSelection();
			if (text == null) return;
			e.preventDefault();
			e.clipboardData.setData("text/plain", text);
		};
		const onCut = (e) => {
			if (isEditingTarget()) {
				const ws = window.getSelection();
				if (ws && !ws.isCollapsed) return;
			}
			const text = serializeSelection();
			if (text == null) return;
			e.preventDefault();
			e.clipboardData.setData("text/plain", text);
			bulkDelete([...selectedIdsRef.current]);
		};
		window.addEventListener("copy", onCopy);
		window.addEventListener("cut", onCut);
		return () => {
			window.removeEventListener("copy", onCopy);
			window.removeEventListener("cut", onCut);
		};
	}, []);

	// Esc clears selection; Delete/Backspace bulk-deletes when nothing is focused.
	// biome-ignore lint/correctness/useExhaustiveDependencies: handler reads refs; bind once
	useEffect(() => {
		const onKey = (e) => {
			const selected = selectedIdsRef.current;
			if (selected.size === 0) return;
			if (e.key === "Escape") {
				setSelectedIds(new Set());
				return;
			}
			if (e.key === "Delete" || e.key === "Backspace") {
				const ae = document.activeElement;
				if (
					ae &&
					(ae.isContentEditable ||
						ae.tagName === "INPUT" ||
						ae.tagName === "TEXTAREA")
				) {
					return;
				}
				e.preventDefault();
				bulkDelete([...selected]);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

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
		const opened = menu;
		setMenu(null);
		const selected = selectedIdsRef.current;
		if (opened?.canDelete && selected.has(id) && selected.size > 1) {
			bulkTransform([...selected], type);
			return;
		}
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
		const opened = menu;
		setMenu(null);
		const selected = selectedIdsRef.current;
		if (opened?.canDelete && selected.has(id) && selected.size > 1) {
			bulkDelete([...selected]);
			return;
		}
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
	let underH1 = false;
	let underH2 = false;
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
		<div
			ref={editorRef}
			onMouseDown={handleEditorMouseDown}
			className="relative w-full px-5 pb-24"
		>
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
						let depth;
						if (block.type === "h1") {
							depth = 0;
							underH1 = true;
							underH2 = false;
						} else if (block.type === "h2") {
							depth = underH1 ? 1 : 0;
							underH2 = true;
						} else if (block.type === "separator") {
							depth = 0;
							underH1 = false;
							underH2 = false;
						} else {
							depth = (underH1 ? 1 : 0) + (underH2 ? 1 : 0);
						}
						return (
							<EditorBlock
								key={block.id}
								block={block}
								numberIndex={numberRun}
								depth={depth}
								selected={selectedIds.has(block.id)}
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
								onPasteBlocks={(text) => handlePasteBlocks(block.id, text)}
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
			{selectionRect && (
				<div
					className="pointer-events-none fixed z-40 rounded border-[2px] border-folder-blue/60 bg-folder-blue/10"
					style={{
						left: selectionRect.x,
						top: selectionRect.y,
						width: selectionRect.w,
						height: selectionRect.h,
					}}
				/>
			)}
		</div>
	);
}
