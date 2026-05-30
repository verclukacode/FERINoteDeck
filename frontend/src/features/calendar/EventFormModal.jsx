import { useEffect, useRef, useState } from "react";
import DuoButton from "../../components/DuoButton.jsx";
import Icon from "../../components/Icon.jsx";
import Modal from "../../components/Modal.jsx";
import { DEFAULT_FOLDER_COLOR, FOLDER_COLORS } from "../../lib/constants.js";
import { useCalendar } from "./CalendarContext.jsx";
import CalendarMonthView from "./CalendarMonthView.jsx";

// Inline color picker used both for tag creation and edit
function ColorPicker({ value, onChange }) {
	return (
		<div className="flex gap-2">
			{FOLDER_COLORS.map((c) => {
				const selected = value === c.key;
				return (
					<button
						key={c.key}
						type="button"
						onClick={() => onChange(c.key)}
						className="flex h-[36px] w-[36px] items-center justify-center rounded-full"
						style={{
							backgroundColor: c.hex,
							border: selected ? "none" : "2.5px solid rgba(0,0,0,0.15)",
						}}
					>
						{selected && (
							<span className="h-[14px] w-[14px] rounded-full bg-bg" />
						)}
					</button>
				);
			})}
		</div>
	);
}

// Mount only while open so state resets for each create/edit.
export default function EventFormModal({ event, prefillDate, onClose }) {
	const { tags, events, addTag, addEvent, editEvent } = useCalendar();
	const isEdit = Boolean(event);

	const [name, setName] = useState(event?.name ?? "");
	const [description, setDescription] = useState(event?.description ?? "");
	// date stored as YYYY-MM-DD
	const [date, setDate] = useState(
		event?.date
			? new Date(event.date).toISOString().slice(0, 10)
			: (prefillDate ?? ""),
	);
	const [tagId, setTagId] = useState(event?.tagId ?? "");

	// Date picker overlay
	const [showDatePicker, setShowDatePicker] = useState(false);
	const datePickerRef = useRef(null);

	// Default calendar navigation to the month of the selected date
	const calDefaultYear = date ? Number(date.slice(0, 4)) : undefined;
	const calDefaultMonth = date ? Number(date.slice(5, 7)) - 1 : undefined;

	// Close picker on outside click
	useEffect(() => {
		if (!showDatePicker) return;
		const handler = (e) => {
			if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
				setShowDatePicker(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [showDatePicker]);

	// New-tag inline form
	const [showNewTag, setShowNewTag] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [newTagColor, setNewTagColor] = useState(DEFAULT_FOLDER_COLOR);
	const [tagError, setTagError] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	// If tags list changes and the selected tagId disappears, clear it
	useEffect(() => {
		if (tagId && !tags.find((t) => t.id === tagId)) setTagId("");
	}, [tags, tagId]);

	const handleCreateTag = async () => {
		if (!newTagName.trim()) {
			setTagError("Tag name required");
			return;
		}
		try {
			const tag = await addTag({ name: newTagName.trim(), color: newTagColor });
			setTagId(tag.id);
			setShowNewTag(false);
			setNewTagName("");
			setNewTagColor(DEFAULT_FOLDER_COLOR);
			setTagError("");
		} catch {
			setTagError("Failed to create tag");
		}
	};

	const submit = async (e) => {
		e.preventDefault();
		if (!name.trim()) {
			setError("Name is required");
			return;
		}
		if (!date) {
			setError("Date is required");
			return;
		}
		setSaving(true);
		setError("");
		try {
			const payload = {
				name: name.trim(),
				description: description.trim() || null,
				date: new Date(date).toISOString(),
				tagId: tagId || null,
			};
			if (isEdit) {
				await editEvent(event.id, payload);
			} else {
				await addEvent(payload);
			}
			onClose();
		} catch (err) {
			setError(err.message ?? "Something went wrong");
		} finally {
			setSaving(false);
		}
	};

	const FOLDER_COLOR_MAP = Object.fromEntries(
		FOLDER_COLORS.map((c) => [c.key, c.hex]),
	);

	return (
		<Modal
			open
			onClose={onClose}
			className="w-[420px] max-w-[calc(100vw-2rem)]"
		>
			<form onSubmit={submit}>
				<h2 className="px-1 text-3xl font-bold text-title">
					{isEdit ? "Edit event" : "New event"}
				</h2>

				{/* Name */}
				<label
					htmlFor="ev-name"
					className="mt-6 block px-1 text-sm font-semibold text-title"
				>
					Name
				</label>
				<input
					id="ev-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Event name..."
					className="mt-2 h-[45px] w-full rounded-[22.5px] bg-bg-secondary px-5 text-[17px] text-title outline-none placeholder:text-body/50"
				/>

				{/* Date picker */}
				<p className="mt-5 px-1 text-sm font-semibold text-title">Date</p>
				<div className="relative mt-2" ref={datePickerRef}>
					<button
						type="button"
						onClick={() => setShowDatePicker((v) => !v)}
						className="flex h-[45px] w-full items-center justify-between rounded-[22.5px] bg-bg-secondary px-5 text-left transition-colors hover:bg-border-soft"
					>
						{date ? (
							<span className="text-[15px] font-semibold text-title">
								{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
									weekday: "short",
									month: "long",
									day: "numeric",
									year: "numeric",
								})}
							</span>
						) : (
							<span className="text-[15px] text-body/50">Select a date...</span>
						)}
						<span className="flex items-center gap-2">
							{date && (
								<button
									type="button"
									tabIndex={0}
									onClick={(e) => {
										e.stopPropagation();
										setDate("");
										setShowDatePicker(false);
									}}
									aria-label="Clear date"
									className="text-body hover:text-title text-xs leading-none"
								>
									✕
								</button>
							)}
							<Icon name="calendar" size={16} className="text-body" />
						</span>
					</button>
					{showDatePicker && (
						<div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[18px] border-[2.5px] border-border-soft bg-bg p-3 shadow-[0_5px_0_rgba(0,0,0,0.15)]">
							<CalendarMonthView
								events={events}
								selectedDay={date}
								onSelectDay={(key) => {
									setDate(key === date ? "" : key);
									setShowDatePicker(false);
								}}
								defaultYear={calDefaultYear}
								defaultMonth={calDefaultMonth}
							/>
						</div>
					)}
				</div>

				{/* Description */}
				<label
					htmlFor="ev-desc"
					className="mt-5 block px-1 text-sm font-semibold text-title"
				>
					Description <span className="font-normal text-body">(optional)</span>
				</label>
				<textarea
					id="ev-desc"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Notes, location, etc..."
					rows={3}
					className="mt-2 w-full resize-none rounded-[18px] bg-bg-secondary px-5 py-3 text-[17px] text-title outline-none placeholder:text-body/50"
				/>

				{/* Tag picker */}
				<p className="mt-5 px-1 text-sm font-semibold text-title">Tag</p>
				<div className="mt-2 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => setTagId("")}
						className={`h-[36px] rounded-[22.5px] border-[2.5px] px-4 text-sm font-semibold transition-colors ${
							tagId === ""
								? "border-title bg-title text-bg"
								: "border-border-soft text-body hover:border-title/30"
						}`}
					>
						None
					</button>
					{tags.map((t) => {
						const hex = FOLDER_COLOR_MAP[t.color] ?? "#499ef3";
						const selected = tagId === t.id;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => setTagId(t.id)}
								className={`flex h-[36px] items-center gap-2 rounded-[22.5px] border-[2.5px] px-4 text-sm font-semibold transition-colors ${
									selected
										? "border-transparent text-bg"
										: "border-border-soft text-body hover:border-title/30"
								}`}
								style={
									selected ? { backgroundColor: hex, borderColor: hex } : {}
								}
							>
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-full"
									style={{ backgroundColor: hex }}
								/>
								{t.name}
							</button>
						);
					})}
					<button
						type="button"
						onClick={() => setShowNewTag((v) => !v)}
						className="flex h-[36px] items-center gap-1.5 rounded-[22.5px] border-[2.5px] border-border-soft px-4 text-sm font-semibold text-body hover:border-title/30"
					>
						+ New tag
					</button>
				</div>

				{/* Inline new-tag creation */}
				{showNewTag && (
					<div className="mt-3 rounded-[18px] border-[2.5px] border-border-soft bg-bg-secondary p-4">
						<p className="mb-2 text-xs font-semibold text-title">New tag</p>
						<input
							value={newTagName}
							onChange={(e) => {
								setNewTagName(e.target.value);
								setTagError("");
							}}
							placeholder="Tag name..."
							className="h-[38px] w-full rounded-[22.5px] bg-bg px-4 text-sm text-title outline-none placeholder:text-body/50"
						/>
						<div className="mt-3">
							<ColorPicker value={newTagColor} onChange={setNewTagColor} />
						</div>
						{tagError && (
							<p className="mt-1 text-xs text-[#ff7070]">{tagError}</p>
						)}
						<div className="mt-3 flex gap-2">
							<button
								type="button"
								onClick={handleCreateTag}
								className="flex-1 rounded-[22.5px] bg-title py-2 text-sm font-semibold text-bg"
							>
								Add
							</button>
							<button
								type="button"
								onClick={() => {
									setShowNewTag(false);
									setTagError("");
								}}
								className="flex-1 rounded-[22.5px] border-[2.5px] border-border-soft py-2 text-sm font-semibold text-body"
							>
								Cancel
							</button>
						</div>
					</div>
				)}

				{error && <p className="mt-3 px-1 text-sm text-[#ff7070]">{error}</p>}

				<DuoButton
					type="submit"
					disabled={saving}
					className="mt-6 h-[45px] w-full bg-body text-bg shadow-[0_2.5px_0_#5b5b5b]"
				>
					{saving ? "Saving..." : isEdit ? "Save" : "Create"}
				</DuoButton>
				<button
					type="button"
					onClick={onClose}
					className="mt-3 w-full text-[17px] font-semibold text-title"
				>
					Cancel
				</button>
			</form>
		</Modal>
	);
}
