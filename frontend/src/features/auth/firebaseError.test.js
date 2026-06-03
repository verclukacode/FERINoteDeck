import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./firebaseError.js";

describe("authErrorMessage", () => {
	it("maps auth/invalid-email", () => {
		expect(authErrorMessage({ code: "auth/invalid-email" })).toBe(
			"That email address is not valid.",
		);
	});

	it("maps auth/invalid-credential", () => {
		expect(authErrorMessage({ code: "auth/invalid-credential" })).toBe(
			"Wrong email or password.",
		);
	});

	it("maps auth/user-not-found", () => {
		expect(authErrorMessage({ code: "auth/user-not-found" })).toBe(
			"Wrong email or password.",
		);
	});

	it("maps auth/wrong-password", () => {
		expect(authErrorMessage({ code: "auth/wrong-password" })).toBe(
			"Wrong email or password.",
		);
	});

	it("maps auth/email-already-in-use", () => {
		expect(authErrorMessage({ code: "auth/email-already-in-use" })).toBe(
			"An account with that email already exists.",
		);
	});

	it("maps auth/weak-password", () => {
		expect(authErrorMessage({ code: "auth/weak-password" })).toBe(
			"Password must be at least 6 characters.",
		);
	});

	it("maps auth/too-many-requests", () => {
		expect(authErrorMessage({ code: "auth/too-many-requests" })).toBe(
			"Too many attempts — please try again later.",
		);
	});

	it("maps auth/network-request-failed", () => {
		expect(authErrorMessage({ code: "auth/network-request-failed" })).toBe(
			"Network error — check your connection.",
		);
	});

	it("returns fallback for unknown codes", () => {
		expect(authErrorMessage({ code: "auth/unknown-thing" })).toBe(
			"Something went wrong. Please try again.",
		);
	});

	it("returns fallback for null error", () => {
		expect(authErrorMessage(null)).toBe(
			"Something went wrong. Please try again.",
		);
	});

	it("returns fallback for error with no code", () => {
		expect(authErrorMessage({})).toBe(
			"Something went wrong. Please try again.",
		);
	});
});
