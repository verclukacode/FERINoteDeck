import { describe, expect, it } from "vitest";
import {
	MARKET_PARAM,
	buildMarketplaceLink,
	parseMarketplaceLink,
} from "./marketplaceLink.js";

describe("MARKET_PARAM", () => {
	it("is 'market'", () => {
		expect(MARKET_PARAM).toBe("market");
	});
});

describe("buildMarketplaceLink", () => {
	it("builds a /?market=note:<id> URL", () => {
		const url = buildMarketplaceLink({ kind: "note", id: "abc123" });
		expect(url).toContain("?market=note:abc123");
	});

	it("builds a /?market=deck:<id> URL", () => {
		const url = buildMarketplaceLink({ kind: "deck", id: "xyz789" });
		expect(url).toContain("?market=deck:xyz789");
	});
});

describe("parseMarketplaceLink", () => {
	it("returns null for null input", () => {
		expect(parseMarketplaceLink(null)).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseMarketplaceLink("")).toBeNull();
	});

	it("returns null for whitespace", () => {
		expect(parseMarketplaceLink("   ")).toBeNull();
	});

	it("parses a raw 'note:<id>' fragment", () => {
		expect(parseMarketplaceLink("note:abc123")).toEqual({
			kind: "note",
			id: "abc123",
		});
	});

	it("parses a raw 'deck:<id>' fragment", () => {
		expect(parseMarketplaceLink("deck:xyz789")).toEqual({
			kind: "deck",
			id: "xyz789",
		});
	});

	it("parses a full URL with ?market= param", () => {
		expect(
			parseMarketplaceLink("https://example.com/?market=note:abc123"),
		).toEqual({ kind: "note", id: "abc123" });
	});

	it("parses a relative URL fragment with ?market=", () => {
		expect(parseMarketplaceLink("/?market=deck:xyz789")).toEqual({
			kind: "deck",
			id: "xyz789",
		});
	});

	it("returns null for unknown kind", () => {
		expect(parseMarketplaceLink("page:abc123")).toBeNull();
	});

	it("returns null for malformed 'note:' with no id", () => {
		expect(parseMarketplaceLink("note:")).toBeNull();
	});

	it("parses ids with hyphens (UUID-style)", () => {
		expect(
			parseMarketplaceLink("note:550e8400-e29b-41d4-a716-446655440000"),
		).toEqual({
			kind: "note",
			id: "550e8400-e29b-41d4-a716-446655440000",
		});
	});
});
