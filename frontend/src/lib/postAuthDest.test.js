import { describe, expect, it } from "vitest";
import { postAuthDest } from "./postAuthDest.js";

describe("postAuthDest", () => {
	it("returns '/' when location is null", () => {
		expect(postAuthDest(null)).toBe("/");
	});

	it("returns '/' when location is undefined", () => {
		expect(postAuthDest(undefined)).toBe("/");
	});

	it("returns '/' when location has no state", () => {
		expect(postAuthDest({})).toBe("/");
	});

	it("returns '/' when state has no from", () => {
		expect(postAuthDest({ state: {} })).toBe("/");
	});

	it("returns the pathname when from has only a pathname", () => {
		expect(postAuthDest({ state: { from: { pathname: "/notes" } } })).toBe(
			"/notes",
		);
	});

	it("appends search string when present", () => {
		expect(
			postAuthDest({
				state: { from: { pathname: "/notes", search: "?q=hello" } },
			}),
		).toBe("/notes?q=hello");
	});

	it("appends hash when present", () => {
		expect(
			postAuthDest({
				state: { from: { pathname: "/notes", hash: "#section" } },
			}),
		).toBe("/notes#section");
	});

	it("combines pathname, search and hash", () => {
		expect(
			postAuthDest({
				state: {
					from: {
						pathname: "/marketplace",
						search: "?market=deck:123",
						hash: "#top",
					},
				},
			}),
		).toBe("/marketplace?market=deck:123#top");
	});

	it("falls back to '/' when pathname is missing", () => {
		expect(postAuthDest({ state: { from: { search: "?q=1" } } })).toBe("/?q=1");
	});
});
