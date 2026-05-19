// API-shaped data layer — talks to the Express + MySQL backend.
// Every request carries the current Firebase user's ID token.
import { auth } from "../lib/firebase.js";

const BASE = "/api";

async function authHeader() {
	const token = await auth.currentUser?.getIdToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, { method = "GET", body } = {}) {
	const headers = await authHeader();
	const opts = { method, headers };
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
		opts.body = JSON.stringify(body);
	}
	const res = await fetch(`${BASE}${path}`, opts);
	if (res.status === 204) return null;
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(data?.error ?? "Request failed");
	return data;
}

export function listFolders() {
	return apiRequest("/folders");
}

export function createFolder({ name, color }) {
	return apiRequest("/folders", { method: "POST", body: { name, color } });
}

export function updateFolder(id, patch) {
	return apiRequest(`/folders/${id}`, { method: "PATCH", body: patch });
}

export function deleteFolder(id) {
	return apiRequest(`/folders/${id}`, { method: "DELETE" });
}

export function reorderFolders(orderedIds) {
	return apiRequest("/folders/order", { method: "PUT", body: { orderedIds } });
}

export function listAllPages() {
	return apiRequest("/pages");
}

export async function listPages(folderId) {
	const pages = await apiRequest("/pages");
	return pages.filter((p) => p.folderId === folderId);
}

export function getPage(id) {
	return apiRequest(`/pages/${id}`);
}

export function createPage({ folderId, title }) {
	return apiRequest("/pages", { method: "POST", body: { folderId, title } });
}

export function updatePage(id, patch) {
	return apiRequest(`/pages/${id}`, { method: "PATCH", body: patch });
}

export function deletePage(id) {
	return apiRequest(`/pages/${id}`, { method: "DELETE" });
}

export function savePages(pages) {
	return apiRequest("/pages/order", { method: "PUT", body: { pages } });
}

// Upload an image file; returns { url } to embed in note markdown.
export async function uploadImage(file) {
	const headers = await authHeader();
	const form = new FormData();
	form.append("image", file);
	const res = await fetch(`${BASE}/images`, {
		method: "POST",
		headers,
		body: form,
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(data?.error ?? "Upload failed");
	return data;
}
