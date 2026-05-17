import { useCallback, useEffect, useRef, useState } from "react";
import SelectionToolbar from "./SelectionToolbar.jsx";
import { SQUIGGLE } from "./dividerShape.js";
import {
	contentToHtml,
	getCursorOffset,
	getSelectionOffsets,
	htmlToContent,
	restoreCursor,
	toggleBoldInContent,
} from "./inlineFormat.js";

const INLINE = new Set(["text", "bullet", "numbered", "task"]);
const HEADINGS = new Set(["h1", "h2"]);

const PLACEHOLDERS = {
	h1: "Heading 1",
	h2: "Heading 2",
	text: "Write something, or press / for blocks",
	bullet: "List item",
	numbered: "List item",
	task: "To-do",
};

const TYPE_CLASS = {
	h1: "text-2xl font-bold text-title",
	h2: "text-lg font-semibold text-title",
	text: "text-title",
	bullet: "text-title",
	numbered: "text-title",
	task: "text-title",
};

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function hasFormatting(content) {
	return (
		/\*\*.+?\*\*/.test(content) || /(?:https?:\/\/|www\.)[^\s<]+/.test(content)
	);
}

function detectAutoFormat(c) {
	let m = c.match(/^- \[[ xX]?\] (.*)$/);
	if (m) return { type: "task", content: m[1] };
	if (/^\[[ xX]?\] /.test(c))
		return { type: "task", content: c.replace(/^\[[ xX]?\] /, "") };
	if (/^## /.test(c)) return { type: "h2", content: c.slice(3) };
	if (/^# /.test(c)) return { type: "h1", content: c.slice(2) };
	if (/^- /.test(c)) return { type: "bullet", content: c.slice(2) };
	m = c.match(/^\d+\. (.*)$/);
	if (m) return { type: "numbered", content: m[1] };
	if (/^---$/.test(c)) return { type: "separator", content: "" };
	return null;
}

export default function EditorBlock({
	block,
	numberIndex,
	showPlaceholder,
	registerRef,
	onUpdate,
	onEnter,
	onBackspaceAtStart,
	onSlash,
	onMove,
	onAutoFormat,
	onFocusChange,
}) {
	const ref = useRef(null);
	const [toolbar, setToolbar] = useState(null);
	const isInline = INLINE.has(block.type);

	// Callback ref keeps blockRefs in sync even when the rendered element
	// changes (e.g. image placeholder -> caption).
	const setNodeRef = useCallback(
		(el) => {
			ref.current = el;
			registerRef(block.id, el);
		},
		[block.id, registerRef],
	);

	// Sync stored content into the DOM when this block is not being edited.
	useEffect(() => {
		const el = ref.current;
		if (!el || document.activeElement === el) return;
		if (isInline || HEADINGS.has(block.type)) {
			const html = isInline ? contentToHtml(block.content) : "";
			if (isInline) {
				if (el.innerHTML !== html) el.innerHTML = html;
			} else if (el.textContent !== block.content) {
				el.textContent = block.content;
			}
		}
	}, [block.content, block.type, isInline]);

	const caretOffset = (el) => {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return 0;
		const range = sel.getRangeAt(0);
		if (!el.contains(range.startContainer)) return 0;
		return getCursorOffset(el, range);
	};

	const applyBold = () => {
		const el = ref.current;
		const offsets = getSelectionOffsets(el);
		if (!offsets || offsets.start === offsets.end) return;
		const next = toggleBoldInContent(block.content, offsets.start, offsets.end);
		onUpdate({ content: next });
		el.innerHTML = contentToHtml(next);
		restoreCursor(el, offsets.end);
		setToolbar(null);
	};

	const handleInput = () => {
		const el = ref.current;
		const content = isInline ? htmlToContent(el) : el.textContent;
		if (block.type === "text") {
			const fmt = detectAutoFormat(content);
			if (fmt) {
				onAutoFormat(fmt.type, fmt.content);
				return;
			}
		}
		onUpdate({ content });
		if (isInline && hasFormatting(content)) {
			const offset = caretOffset(el);
			el.innerHTML = contentToHtml(content);
			restoreCursor(el, offset);
		}
	};

	const handleKeyDown = (e) => {
		const el = ref.current;
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onEnter({ pos: caretOffset(el), len: el.textContent.length });
			return;
		}
		if (e.key === "Backspace") {
			const sel = window.getSelection();
			if (caretOffset(el) === 0 && sel?.isCollapsed) {
				e.preventDefault();
				onBackspaceAtStart();
			}
			return;
		}
		if (e.key === "/" && !block.content) {
			e.preventDefault();
			onSlash();
			return;
		}
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
			e.preventDefault();
			applyBold();
			return;
		}
		if (e.altKey && e.key === "ArrowUp") {
			e.preventDefault();
			onMove(-1);
			return;
		}
		if (e.altKey && e.key === "ArrowDown") {
			e.preventDefault();
			onMove(1);
		}
	};

	const handleSelect = () => {
		const el = ref.current;
		if (!isInline) return;
		const offsets = getSelectionOffsets(el);
		if (!offsets || offsets.start === offsets.end) {
			setToolbar(null);
			return;
		}
		const range = window.getSelection().getRangeAt(0);
		const rect = range.getBoundingClientRect();
		setToolbar({ left: rect.left, top: rect.top, width: rect.width });
	};

	const handleClick = (e) => {
		const link = e.target.closest("a");
		if (link && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			window.open(link.href, "_blank", "noopener");
		}
	};

	const handlePaste = (e) => {
		e.preventDefault();
		const text = e.clipboardData.getData("text/plain").replace(/\n/g, " ");
		document.execCommand("insertText", false, text);
	};

	const handleImageFile = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > MAX_IMAGE_BYTES) {
			alert("Image is too large — please pick one under 1.5 MB.");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => onUpdate({ imageUrl: String(reader.result) });
		reader.readAsDataURL(file);
	};

	if (block.type === "separator") {
		return (
			<button
				type="button"
				ref={setNodeRef}
				onFocus={() => onFocusChange(block.id)}
				onClick={() => onEnter({ pos: 1, len: 0 })}
				onKeyDown={(e) => {
					if (e.key === "Backspace") {
						e.preventDefault();
						onBackspaceAtStart();
					}
				}}
				className="my-2 block w-full cursor-pointer rounded-lg outline-none focus:bg-bg-secondary"
			>
				<svg
					viewBox="0 0 2000 22"
					preserveAspectRatio="xMinYMid slice"
					className="h-5 w-full"
					aria-hidden="true"
				>
					<path
						d={SQUIGGLE}
						fill="none"
						stroke="#cdcdcd"
						strokeWidth="3"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
		);
	}

	if (block.type === "image") {
		if (!block.imageUrl) {
			return (
				<label className="my-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-body/40 py-8 text-body">
					Upload image
					<input
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleImageFile}
					/>
				</label>
			);
		}
		return (
			<div className="group my-2">
				<div className="relative inline-block">
					<img
						src={block.imageUrl}
						alt={block.content}
						className="max-h-[420px] rounded-xl"
					/>
					<button
						type="button"
						onClick={() => onUpdate({ imageUrl: "" })}
						className="absolute right-2 top-2 rounded-lg bg-bg/90 px-2 py-1 text-sm font-medium text-folder-red opacity-0 group-hover:opacity-100"
					>
						Remove
					</button>
				</div>
				<div
					ref={setNodeRef}
					contentEditable
					suppressContentEditableWarning
					data-placeholder="Caption..."
					onFocus={() => onFocusChange(block.id)}
					onBlur={() => onFocusChange(null)}
					onInput={() => onUpdate({ content: ref.current.textContent })}
					onKeyDown={handleKeyDown}
					className="mt-1 text-sm text-body outline-none"
				/>
			</div>
		);
	}

	const Tag = block.type === "h1" ? "h1" : block.type === "h2" ? "h2" : "div";
	const editable = (
		<Tag
			ref={setNodeRef}
			contentEditable
			suppressContentEditableWarning
			data-placeholder={showPlaceholder ? PLACEHOLDERS[block.type] : ""}
			onFocus={() => onFocusChange(block.id)}
			onBlur={() => {
				onFocusChange(null);
				setToolbar(null);
			}}
			onInput={handleInput}
			onKeyDown={handleKeyDown}
			onKeyUp={handleSelect}
			onMouseUp={handleSelect}
			onClick={handleClick}
			onPaste={handlePaste}
			className={`flex-1 outline-none ${TYPE_CLASS[block.type]} ${
				block.type === "task" && block.checked ? "text-body line-through" : ""
			}`}
		/>
	);

	if (block.type === "bullet") {
		return (
			<div className="flex gap-2 py-0.5">
				<span className="select-none pt-1 text-body">•</span>
				{editable}
				<SelectionToolbar rect={toolbar} onBold={applyBold} />
			</div>
		);
	}

	if (block.type === "numbered") {
		return (
			<div className="flex gap-2 py-0.5">
				<span className="select-none pt-0.5 text-body">{numberIndex}.</span>
				{editable}
				<SelectionToolbar rect={toolbar} onBold={applyBold} />
			</div>
		);
	}

	if (block.type === "task") {
		return (
			<div className="flex gap-2 py-0.5">
				<input
					type="checkbox"
					checked={block.checked}
					onChange={(e) => onUpdate({ checked: e.target.checked })}
					className="mt-1 h-[18px] w-[18px] accent-folder-blue"
				/>
				{editable}
				<SelectionToolbar rect={toolbar} onBold={applyBold} />
			</div>
		);
	}

	return (
		<div className="py-0.5">
			{editable}
			<SelectionToolbar rect={toolbar} onBold={applyBold} />
		</div>
	);
}
