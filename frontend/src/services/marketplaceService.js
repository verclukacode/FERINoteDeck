import { auth } from "../lib/firebase.js";

// Duplicates the small apiRequest helper from notesService.js for the
// marketplace endpoints. Future cleanup: extract a shared services/api.js.
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

export function listMarketplace({
	q = "",
	kind = "all",
	offset = 0,
	limit = 20,
} = {}) {
	const qs = new URLSearchParams({
		q,
		kind,
		offset: String(offset),
		limit: String(limit),
	}).toString();
	return apiRequest(`/marketplace?${qs}`);
}

export function getMarketplaceNote(id) {
	return apiRequest(`/marketplace/notes/${id}`);
}

export function getMarketplaceDeck(id) {
	return apiRequest(`/marketplace/decks/${id}`);
}

export function cloneMarketplaceNote(id, folderId) {
	return apiRequest(`/marketplace/notes/${id}/clone`, {
		method: "POST",
		body: { folderId },
	});
}

export function cloneMarketplaceDeck(id, folderId) {
	return apiRequest(`/marketplace/decks/${id}/clone`, {
		method: "POST",
		body: { folderId },
	});
}
