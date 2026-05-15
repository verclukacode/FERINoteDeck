import { seedFolders, seedPages } from "../data/seed.js";
import { STORAGE_KEYS } from "../lib/constants.js";

function read(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function write(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeeded() {
	if (localStorage.getItem(STORAGE_KEYS.folders) === null) {
		write(STORAGE_KEYS.folders, seedFolders);
		write(STORAGE_KEYS.pages, seedPages);
	}
}

export function getFolders() {
	ensureSeeded();
	return Promise.resolve(read(STORAGE_KEYS.folders, []));
}

export function getPages() {
	ensureSeeded();
	return Promise.resolve(read(STORAGE_KEYS.pages, []));
}

export function saveFolders(folders) {
	write(STORAGE_KEYS.folders, folders);
	return Promise.resolve(folders);
}

export function savePages(pages) {
	write(STORAGE_KEYS.pages, pages);
	return Promise.resolve(pages);
}
