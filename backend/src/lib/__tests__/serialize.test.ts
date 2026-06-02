import { describe, expect, it } from "vitest";
import { serialize } from "../serialize";

describe("serialize", () => {
	it("converts a BigInt primitive to Number", () => {
		expect(serialize(BigInt(1_700_000_000_000))).toBe(1_700_000_000_000);
	});

	it("converts BigInt 0 to 0", () => {
		expect(serialize(BigInt(0))).toBe(0);
	});

	it("leaves a regular number unchanged", () => {
		expect(serialize(42)).toBe(42);
	});

	it("leaves a string unchanged", () => {
		expect(serialize("hello")).toBe("hello");
	});

	it("leaves null unchanged", () => {
		expect(serialize(null)).toBeNull();
	});

	it("leaves undefined unchanged", () => {
		expect(serialize(undefined)).toBeUndefined();
	});

	it("leaves a boolean unchanged", () => {
		expect(serialize(true)).toBe(true);
	});

	it("leaves a Date unchanged (does not convert to number)", () => {
		const d = new Date("2024-01-01");
		expect(serialize(d)).toBe(d);
	});

	it("converts BigInt fields inside a flat object", () => {
		const input = { id: "abc", due: BigInt(1_700_000_000_000), reps: 3 };
		const result = serialize(input);
		expect(result).toEqual({ id: "abc", due: 1_700_000_000_000, reps: 3 });
	});

	it("converts BigInt fields in a nested object", () => {
		const input = { card: { due: BigInt(1_000), name: "test" } };
		const result = serialize(input);
		expect(result).toEqual({ card: { due: 1_000, name: "test" } });
	});

	it("converts BigInts inside an array", () => {
		const input = [BigInt(1), BigInt(2), BigInt(3)];
		expect(serialize(input)).toEqual([1, 2, 3]);
	});

	it("converts BigInts in an array of objects", () => {
		const input = [
			{ id: "a", due: BigInt(100) },
			{ id: "b", due: BigInt(200) },
		];
		expect(serialize(input)).toEqual([
			{ id: "a", due: 100 },
			{ id: "b", due: 200 },
		]);
	});

	it("handles deeply nested BigInt values", () => {
		const input = { a: { b: { c: BigInt(999) } } };
		expect(serialize(input)).toEqual({ a: { b: { c: 999 } } });
	});

	it("handles mixed arrays (BigInt + string + number)", () => {
		const input = [BigInt(5), "hello", 42, null];
		expect(serialize(input)).toEqual([5, "hello", 42, null]);
	});

	it("handles an empty object", () => {
		expect(serialize({})).toEqual({});
	});

	it("handles an empty array", () => {
		expect(serialize([])).toEqual([]);
	});
});
