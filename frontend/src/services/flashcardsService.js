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

// Flashcard folders
export function listFlashcardFolders() {
	return apiRequest("/flashcard-folders");
}

export function createFlashcardFolder({ name, color }) {
	return apiRequest("/flashcard-folders", {
		method: "POST",
		body: { name, color },
	});
}

export function updateFlashcardFolder(id, patch) {
	return apiRequest(`/flashcard-folders/${id}`, {
		method: "PATCH",
		body: patch,
	});
}

export function deleteFlashcardFolder(id) {
	return apiRequest(`/flashcard-folders/${id}`, { method: "DELETE" });
}

export function reorderFlashcardFolders(orderedIds) {
	return apiRequest("/flashcard-folders/order", {
		method: "PUT",
		body: { orderedIds },
	});
}

// Decks
export function listDecks() {
	return apiRequest("/decks");
}

export function createDeck({ folderId, name }) {
	return apiRequest("/decks", { method: "POST", body: { folderId, name } });
}

export function updateDeck(id, patch) {
	return apiRequest(`/decks/${id}`, { method: "PATCH", body: patch });
}

export function deleteDeck(id) {
	return apiRequest(`/decks/${id}`, { method: "DELETE" });
}

export function saveDecks(decks) {
	return apiRequest("/decks/order", { method: "PUT", body: { decks } });
}

// Cards
export function listCards() {
	return apiRequest("/cards");
}

export function createCard({ deckId, type, question, answer }) {
	return apiRequest("/cards", {
		method: "POST",
		body: { deckId, type, question, answer },
	});
}

export function updateCard(id, patch) {
	return apiRequest(`/cards/${id}`, { method: "PATCH", body: patch });
}

export function deleteCard(id) {
	return apiRequest(`/cards/${id}`, { method: "DELETE" });
}
