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

// Calendar Tags
export function listCalendarTags() {
	return apiRequest("/calendar-tags");
}

export function createCalendarTag({ name, color }) {
	return apiRequest("/calendar-tags", {
		method: "POST",
		body: { name, color },
	});
}

export function updateCalendarTag(id, patch) {
	return apiRequest(`/calendar-tags/${id}`, { method: "PATCH", body: patch });
}

export function deleteCalendarTag(id) {
	return apiRequest(`/calendar-tags/${id}`, { method: "DELETE" });
}

// Calendar Events
export function listCalendarEvents({ from, to } = {}) {
	const params = new URLSearchParams();
	if (from) params.set("from", from);
	if (to) params.set("to", to);
	const qs = params.toString();
	return apiRequest(`/calendar-events${qs ? `?${qs}` : ""}`);
}

export function getUpcomingEvents() {
	return apiRequest("/calendar-events/upcoming");
}

export function createCalendarEvent({ name, description, date, tagId }) {
	return apiRequest("/calendar-events", {
		method: "POST",
		body: { name, description, date, tagId },
	});
}

export function updateCalendarEvent(id, patch) {
	return apiRequest(`/calendar-events/${id}`, { method: "PATCH", body: patch });
}

export function deleteCalendarEvent(id) {
	return apiRequest(`/calendar-events/${id}`, { method: "DELETE" });
}
