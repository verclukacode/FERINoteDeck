import { auth } from "../lib/firebase.js";

// Mirrors the small apiRequest helper used by the other services. TODO: extract
// a shared services/api.js once we have a third copy.
const BASE = "/api";

async function authHeader() {
	const token = await auth.currentUser?.getIdToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path) {
	const headers = await authHeader();
	const res = await fetch(`${BASE}${path}`, { headers });
	if (res.status === 204) return null;
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(data?.error ?? "Request failed");
	return data;
}

export function search(q) {
	return apiRequest(`/search?q=${encodeURIComponent(q)}`);
}
