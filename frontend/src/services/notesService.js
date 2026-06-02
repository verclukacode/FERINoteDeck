// API-shaped data layer — talks to the Express + MySQL backend.
// Every request carries the current Firebase user's ID token.
import { auth } from "../lib/firebase.js";

const BASE = "/api";

async function authHeader() {
	await auth.authStateReady();
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

export function createPage({ folderId, title, content }) {
	const body = { folderId, title };
	if (content !== undefined) body.content = content;
	return apiRequest("/pages", { method: "POST", body });
}

// Upload files + prompt to the AI import endpoint. Returns { title, content }
// — the page is NOT created yet; the caller picks a folder + confirms the
// title before calling createPage. Tier-gated server-side: basic accounts
// get 403; Pro/Premium pass through.
export async function importFiles({ files, prompt }) {
	await auth.authStateReady();
	const token = await auth.currentUser?.getIdToken();
	const form = new FormData();
	for (const f of files) form.append("files", f);
	form.append("prompt", prompt ?? "");
	const res = await fetch(`${BASE}/import`, {
		method: "POST",
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		body: form,
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const err = new Error(data?.error ?? "Import failed");
		err.status = res.status;
		throw err;
	}
	return data;
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

export function getMe() {
	return apiRequest("/users/me");
}

export function setPresetAvatar(avatarUrl) {
	return apiRequest("/users/me", { method: "PATCH", body: { avatarUrl } });
}

export function setUsername(username) {
	return apiRequest("/users/me", { method: "PATCH", body: { username } });
}

export function checkUsername(username) {
	return apiRequest(`/users/check-username/${encodeURIComponent(username)}`);
}

export async function uploadAvatar(file) {
	const headers = await authHeader();
	const form = new FormData();
	form.append("avatar", file);
	const res = await fetch(`${BASE}/users/me/avatar`, {
		method: "POST",
		headers,
		body: form,
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(data?.error ?? "Upload failed");
	return data;
}

// Direct sharing / collaboration invites

export function sendInvite(pageId, username) {
	return apiRequest("/invites", { method: "POST", body: { pageId, username } });
}

export function getInvites() {
	return apiRequest("/invites");
}

export function respondInvite(inviteId, action) {
	return apiRequest(`/invites/${inviteId}`, {
		method: "PATCH",
		body: { action },
	});
}

export function listSharedWith(pageId) {
	return apiRequest(`/invites/sent?pageId=${encodeURIComponent(pageId)}`);
}

export function listAllSharedWith() {
	return apiRequest("/invites/sent/all");
}

export function revokeInvite(inviteId) {
	return apiRequest(`/invites/${inviteId}`, { method: "DELETE" });
}

export function sendPresence(pageId) {
	return apiRequest(`/pages/${pageId}/presence`, { method: "POST" });
}

export function getPresence(pageId) {
	return apiRequest(`/pages/${pageId}/presence`);
}

export function listSharedPages() {
	return apiRequest("/pages/shared");
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
