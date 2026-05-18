// API-shaped facade over the data layer. Swap the repo import (or the bodies)
// for a fetch-based backend client without touching any component.
import { DEFAULT_FOLDER_COLOR } from "../lib/constants.js";
import { createId } from "../lib/id.js";
import * as repo from "./localStorageRepo.js";

function byOrder(a, b) {
	return a.order - b.order;
}

export async function listFolders() {
	const folders = await repo.getFolders();
	return [...folders].sort(byOrder);
}

export async function listPages(folderId) {
	const pages = await repo.getPages();
	return pages.filter((p) => p.folderId === folderId).sort(byOrder);
}

export async function listAllPages() {
	const pages = await repo.getPages();
	return [...pages].sort(byOrder);
}

export async function getPage(id) {
	const pages = await repo.getPages();
	return pages.find((p) => p.id === id) ?? null;
}

export async function createFolder({ name, color }) {
	const folders = await repo.getFolders();
	const folder = {
		id: createId(),
		name: name.trim() || "Untitled folder",
		color: color || DEFAULT_FOLDER_COLOR,
		order: folders.length,
		collapsed: true,
	};
	await repo.saveFolders([...folders, folder]);
	return folder;
}

export async function updateFolder(id, patch) {
	const folders = await repo.getFolders();
	const next = folders.map((f) => (f.id === id ? { ...f, ...patch } : f));
	await repo.saveFolders(next);
	return next.find((f) => f.id === id);
}

export async function deleteFolder(id) {
	const folders = await repo.getFolders();
	const pages = await repo.getPages();
	await repo.saveFolders(folders.filter((f) => f.id !== id));
	await repo.savePages(pages.filter((p) => p.folderId !== id));
}

export async function reorderFolders(orderedIds) {
	const folders = await repo.getFolders();
	const next = folders.map((f) => ({ ...f, order: orderedIds.indexOf(f.id) }));
	await repo.saveFolders(next);
}

export async function createPage({ folderId, title }) {
	const pages = await repo.getPages();
	const siblings = pages.filter((p) => p.folderId === folderId);
	const name = (title || "").trim() || "Untitled page";
	const page = {
		id: createId(),
		folderId,
		title: name,
		content: "Nothing here yet, tap to edit.",
		order: siblings.length,
	};
	await repo.savePages([...pages, page]);
	return page;
}

export async function updatePage(id, patch) {
	const pages = await repo.getPages();
	const next = pages.map((p) => (p.id === id ? { ...p, ...patch } : p));
	await repo.savePages(next);
	return next.find((p) => p.id === id);
}

export async function deletePage(id) {
	const pages = await repo.getPages();
	await repo.savePages(pages.filter((p) => p.id !== id));
}

// Persists the full pages collection — used after drag-and-drop, which can
// reorder pages and move them between folders in one gesture.
export async function savePages(pages) {
	await repo.savePages(pages);
}
