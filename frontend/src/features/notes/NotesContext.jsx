import { arrayMove } from "@dnd-kit/sortable";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { VIEW } from "../../lib/constants.js";
import * as service from "../../services/notesService.js";

const NotesContext = createContext(null);

// Recompute the per-folder `order` field from current array position.
function withFolderOrder(pages) {
	const counters = {};
	return pages.map((p) => {
		const order = counters[p.folderId] ?? 0;
		counters[p.folderId] = order + 1;
		return { ...p, order };
	});
}

export function NotesProvider({ children }) {
	const [folders, setFolders] = useState([]);
	const [pages, setPages] = useState([]);
	const [view, setView] = useState(VIEW.NOTES);
	const [selectedPageId, setSelectedPageId] = useState(null);
	const [loading, setLoading] = useState(true);

	const pagesRef = useRef(pages);
	pagesRef.current = pages;

	useEffect(() => {
		let active = true;
		Promise.all([service.listFolders(), service.listAllPages()]).then(
			([f, p]) => {
				if (!active) return;
				setFolders(f);
				setPages(p);
				setLoading(false);
			},
		);
		return () => {
			active = false;
		};
	}, []);

	const addFolder = useCallback(async ({ name, color }) => {
		const folder = await service.createFolder({ name, color });
		setFolders((prev) => [...prev, folder]);
	}, []);

	const removeFolder = useCallback(
		async (id) => {
			await service.deleteFolder(id);
			setFolders((prev) => prev.filter((f) => f.id !== id));
			setPages((prev) => {
				const removed = prev.filter((p) => p.folderId === id).map((p) => p.id);
				if (removed.includes(selectedPageId)) setSelectedPageId(null);
				return prev.filter((p) => p.folderId !== id);
			});
		},
		[selectedPageId],
	);

	const toggleCollapsed = useCallback(async (id) => {
		setFolders((prev) => {
			const target = prev.find((f) => f.id === id);
			service.updateFolder(id, { collapsed: !target.collapsed });
			return prev.map((f) =>
				f.id === id ? { ...f, collapsed: !f.collapsed } : f,
			);
		});
	}, []);

	const editFolder = useCallback(async (id, patch) => {
		await service.updateFolder(id, patch);
		setFolders((prev) =>
			prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
		);
	}, []);

	const addPage = useCallback(async (folderId) => {
		const page = await service.createPage({ folderId, title: "Untitled page" });
		setPages((prev) => [...prev, page]);
		setFolders((prev) =>
			prev.map((f) => (f.id === folderId ? { ...f, collapsed: false } : f)),
		);
		setSelectedPageId(page.id);
	}, []);

	const removePage = useCallback(async (id) => {
		await service.deletePage(id);
		setPages((prev) => prev.filter((p) => p.id !== id));
		setSelectedPageId((cur) => (cur === id ? null : cur));
	}, []);

	const selectPage = useCallback((id) => setSelectedPageId(id), []);

	// Live cross-folder move while a page is dragged over another folder.
	const handleDndOver = useCallback(
		({ activeId, activeType, overId, overType }) => {
			if (activeType !== "page" || !overId || activeId === overId) return;
			setPages((prev) => {
				const active = prev.find((p) => p.id === activeId);
				if (!active) return prev;
				const targetFolderId =
					overType === "folder"
						? overId
						: prev.find((p) => p.id === overId)?.folderId;
				if (!targetFolderId || targetFolderId === active.folderId) return prev;
				const without = prev.filter((p) => p.id !== activeId);
				const moved = { ...active, folderId: targetFolderId };
				if (overType === "page") {
					const idx = without.findIndex((p) => p.id === overId);
					return [...without.slice(0, idx), moved, ...without.slice(idx)];
				}
				return [...without, moved];
			});
		},
		[],
	);

	// Finalize a drag: reorder folders, or settle a page's position, then persist.
	const handleDndEnd = useCallback(
		({ activeId, activeType, overId, overType }) => {
			if (activeType === "folder") {
				if (!overId) return;
				const targetFolderId =
					overType === "folder"
						? overId
						: pagesRef.current.find((p) => p.id === overId)?.folderId;
				if (!targetFolderId) return;
				setFolders((prev) => {
					const from = prev.findIndex((f) => f.id === activeId);
					const to = prev.findIndex((f) => f.id === targetFolderId);
					if (from < 0 || to < 0) return prev;
					const next = arrayMove(prev, from, to).map((f, order) => ({
						...f,
						order,
					}));
					service.reorderFolders(next.map((f) => f.id));
					return next;
				});
				return;
			}

			setPages((prev) => {
				const active = prev.find((p) => p.id === activeId);
				if (!active) return prev;
				const folderId = active.folderId;
				let group = prev.filter((p) => p.folderId === folderId);
				const overPage = prev.find((p) => p.id === overId);
				if (overPage && overPage.folderId === folderId) {
					const from = group.findIndex((p) => p.id === activeId);
					const to = group.findIndex((p) => p.id === overId);
					if (from >= 0 && to >= 0) group = arrayMove(group, from, to);
				}
				const others = prev.filter((p) => p.folderId !== folderId);
				const next = withFolderOrder([...others, ...group]);
				service.savePages(next);
				return next;
			});
		},
		[],
	);

	const value = useMemo(
		() => ({
			folders,
			pages,
			view,
			selectedPageId,
			selectedPage: pages.find((p) => p.id === selectedPageId) ?? null,
			loading,
			setView,
			addFolder,
			editFolder,
			removeFolder,
			toggleCollapsed,
			addPage,
			removePage,
			selectPage,
			handleDndOver,
			handleDndEnd,
		}),
		[
			folders,
			pages,
			view,
			selectedPageId,
			loading,
			addFolder,
			editFolder,
			removeFolder,
			toggleCollapsed,
			addPage,
			removePage,
			selectPage,
			handleDndOver,
			handleDndEnd,
		],
	);

	return (
		<NotesContext.Provider value={value}>{children}</NotesContext.Provider>
	);
}

export function useNotes() {
	const ctx = useContext(NotesContext);
	if (!ctx) throw new Error("useNotes must be used within NotesProvider");
	return ctx;
}
