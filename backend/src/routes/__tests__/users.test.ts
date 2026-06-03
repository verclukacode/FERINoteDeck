import { describe, expect, it } from "vitest";
import { USERNAME_RE } from "../users";

describe("USERNAME_RE", () => {
	it("accepts a simple lowercase username", () => {
		expect(USERNAME_RE.test("alice")).toBe(true);
	});

	it("accepts uppercase letters", () => {
		expect(USERNAME_RE.test("Alice")).toBe(true);
	});

	it("accepts digits", () => {
		expect(USERNAME_RE.test("user123")).toBe(true);
	});

	it("accepts underscores", () => {
		expect(USERNAME_RE.test("cool_name")).toBe(true);
	});

	it("accepts minimum length (3 chars)", () => {
		expect(USERNAME_RE.test("abc")).toBe(true);
	});

	it("accepts maximum length (20 chars)", () => {
		expect(USERNAME_RE.test("a".repeat(20))).toBe(true);
	});

	it("rejects too short (2 chars)", () => {
		expect(USERNAME_RE.test("ab")).toBe(false);
	});

	it("rejects too long (21 chars)", () => {
		expect(USERNAME_RE.test("a".repeat(21))).toBe(false);
	});

	it("rejects hyphen", () => {
		expect(USERNAME_RE.test("cool-name")).toBe(false);
	});

	it("rejects space", () => {
		expect(USERNAME_RE.test("cool name")).toBe(false);
	});

	it("rejects dot", () => {
		expect(USERNAME_RE.test("cool.name")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(USERNAME_RE.test("")).toBe(false);
	});

	it("rejects at-sign", () => {
		expect(USERNAME_RE.test("@user")).toBe(false);
	});
});
