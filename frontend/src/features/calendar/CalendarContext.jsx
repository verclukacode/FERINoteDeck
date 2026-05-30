import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	createCalendarEvent,
	createCalendarTag,
	deleteCalendarEvent,
	deleteCalendarTag,
	listCalendarEvents,
	listCalendarTags,
	updateCalendarEvent,
	updateCalendarTag,
} from "../../services/calendarService.js";

const CalendarContext = createContext(null);
export { CalendarContext };

export function CalendarProvider({ children }) {
	const [tags, setTags] = useState([]);
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([listCalendarTags(), listCalendarEvents()])
			.then(([t, e]) => {
				setTags(t ?? []);
				setEvents(e ?? []);
			})
			.finally(() => setLoading(false));
	}, []);

	// Tags
	const addTag = useCallback(async ({ name, color }) => {
		const tag = await createCalendarTag({ name, color });
		setTags((prev) => [...prev, tag]);
		return tag;
	}, []);

	const editTag = useCallback(async (id, patch) => {
		const tag = await updateCalendarTag(id, patch);
		setTags((prev) => prev.map((t) => (t.id === id ? tag : t)));
		return tag;
	}, []);

	const removeTag = useCallback(async (id) => {
		await deleteCalendarTag(id);
		setTags((prev) => prev.filter((t) => t.id !== id));
		// Clear tagId on affected events optimistically
		setEvents((prev) =>
			prev.map((e) => (e.tagId === id ? { ...e, tagId: null, tag: null } : e)),
		);
	}, []);

	// Events
	const addEvent = useCallback(async (data) => {
		const event = await createCalendarEvent(data);
		setEvents((prev) =>
			[...prev, event].sort((a, b) => new Date(a.date) - new Date(b.date)),
		);
		return event;
	}, []);

	const editEvent = useCallback(async (id, patch) => {
		const event = await updateCalendarEvent(id, patch);
		setEvents((prev) =>
			prev
				.map((e) => (e.id === id ? event : e))
				.sort((a, b) => new Date(a.date) - new Date(b.date)),
		);
		return event;
	}, []);

	const removeEvent = useCallback(async (id) => {
		await deleteCalendarEvent(id);
		setEvents((prev) => prev.filter((e) => e.id !== id));
	}, []);

	const refreshEvents = useCallback(async () => {
		const [t, e] = await Promise.all([
			listCalendarTags(),
			listCalendarEvents(),
		]);
		setTags(t ?? []);
		setEvents(e ?? []);
	}, []);

	return (
		<CalendarContext.Provider
			value={{
				tags,
				events,
				loading,
				addTag,
				editTag,
				removeTag,
				addEvent,
				editEvent,
				removeEvent,
				refreshEvents,
			}}
		>
			{children}
		</CalendarContext.Provider>
	);
}

export function useCalendar() {
	const ctx = useContext(CalendarContext);
	if (!ctx) throw new Error("useCalendar must be used within CalendarProvider");
	return ctx;
}
