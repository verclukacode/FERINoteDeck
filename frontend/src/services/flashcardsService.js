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

export function createDeck({ folderId, name, cards }) {
	const body = { folderId, name };
	if (Array.isArray(cards) && cards.length) body.cards = cards;
	return apiRequest("/decks", { method: "POST", body });
}

// Bulk-append cards to an existing deck (used by CSV import → "existing deck").
export function bulkCreateCards({ deckId, cards }) {
	return apiRequest("/cards/bulk", {
		method: "POST",
		body: { deckId, cards },
	});
}

// AI deck generation: backend reads the page (owner or accepted invitee),
// asks OpenAI for { cards: [{question, answer}] } and returns them
// preview-only (nothing is persisted yet). Use createDeck with the returned
// cards to commit the deck once the user picks a folder.
export function generateDeckFromNote(pageId) {
	return apiRequest(`/pages/${pageId}/generate-deck`, { method: "POST" });
}

// Generate a test deck from notes + files. Accepts a FormData with optional
// "files" entries and a "pageIds" JSON string. Saves directly to "Tests"
// folder. Returns { deck, cards, folder? }.
export async function generateTestDeck(formData) {
	await auth.authStateReady();
	const token = await auth.currentUser?.getIdToken();
	const headers = token ? { Authorization: `Bearer ${token}` } : {};
	const res = await fetch(`${BASE}/decks/generate-test`, {
		method: "POST",
		headers,
		body: formData,
	});
	if (res.status === 204) return null;
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const err = new Error(data?.error ?? "Request failed");
		err.status = res.status;
		throw err;
	}
	return data;
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

// Due study queue for a deck: { counts: {new, learning, review}, cards: [...] }
export function getDeckQueue(deckId) {
	return apiRequest(`/decks/${deckId}/queue`);
}

export function resetDeck(id) {
	return apiRequest(`/decks/${id}/reset`, { method: "POST" });
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

// Grade a card during study (1=Again 2=Hard 3=Good 4=Easy). Returns updated card.
export function answerCard(id, grade, elapsedMs) {
	return apiRequest(`/cards/${id}/answer`, {
		method: "POST",
		body: { grade, elapsedMs },
	});
}

export function resetCard(id) {
	return apiRequest(`/cards/${id}/reset`, { method: "POST" });
}

// Study settings (profile-wide Anki defaults)
export function getStudySettings() {
	return apiRequest("/users/me/study-settings");
}

export function updateStudySettings(patch) {
	return apiRequest("/users/me/study-settings", {
		method: "PATCH",
		body: patch,
	});
}

// Direct deck-sharing invites (mirror of note invites)
export function sendDeckInvite(deckId, username) {
	return apiRequest("/deck-invites", {
		method: "POST",
		body: { deckId, username },
	});
}

export function getDeckInvites() {
	return apiRequest("/deck-invites");
}

export function respondDeckInvite(inviteId, action) {
	return apiRequest(`/deck-invites/${inviteId}`, {
		method: "PATCH",
		body: { action },
	});
}

export function getStreak() {
	return apiRequest("/users/me/streak");
}

export function getActivity(days = 30) {
	return apiRequest(`/users/me/activity?days=${days}`);
}

export function getDeckTodayStats(deckId) {
	return apiRequest(`/decks/${deckId}/stats/today`);
}

export function getDeckLeaderboard(deckId) {
	return apiRequest(`/decks/${deckId}/leaderboard`);
}

export function listAllDeckSharedWith() {
	return apiRequest("/deck-invites/sent/all");
}

export function revokeDeckInvite(inviteId) {
	return apiRequest(`/deck-invites/${inviteId}`, { method: "DELETE" });
}
