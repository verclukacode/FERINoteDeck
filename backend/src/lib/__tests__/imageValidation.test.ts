import { describe, expect, it } from "vitest";
import {
	ALLOWED_IMAGE_EXTS,
	extractImageUrls,
	isAllowedImageUrl,
} from "../imageValidation";

describe("ALLOWED_IMAGE_EXTS", () => {
	it("includes .png, .jpg, .jpeg, .gif, .webp", () => {
		expect(ALLOWED_IMAGE_EXTS).toEqual(
			expect.arrayContaining([".png", ".jpg", ".jpeg", ".gif", ".webp"]),
		);
	});

	it("does not include .svg (security: SVG can carry executable script)", () => {
		expect(ALLOWED_IMAGE_EXTS).not.toContain(".svg");
	});

	it("does not include .pdf or .html", () => {
		expect(ALLOWED_IMAGE_EXTS).not.toContain(".pdf");
		expect(ALLOWED_IMAGE_EXTS).not.toContain(".html");
	});
});

describe("isAllowedImageUrl", () => {
	it("allows /api/images/ paths (uploaded images)", () => {
		expect(isAllowedImageUrl("/api/images/abc123.png")).toBe(true);
		expect(isAllowedImageUrl("/api/images/")).toBe(true);
	});

	it("allows /avatars/ paths (preset avatars)", () => {
		expect(isAllowedImageUrl("/avatars/default.jpg")).toBe(true);
		expect(isAllowedImageUrl("/avatars/")).toBe(true);
	});

	it("rejects external URLs", () => {
		expect(isAllowedImageUrl("https://example.com/img.png")).toBe(false);
		expect(isAllowedImageUrl("http://evil.com/tracker.gif")).toBe(false);
	});

	it("rejects other internal paths not on the allowlist", () => {
		expect(isAllowedImageUrl("/uploads/foo.png")).toBe(false);
		expect(isAllowedImageUrl("/static/logo.png")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isAllowedImageUrl("")).toBe(false);
	});

	it("rejects non-string values (runtime safety)", () => {
		expect(isAllowedImageUrl(null as unknown as string)).toBe(false);
		expect(isAllowedImageUrl(undefined as unknown as string)).toBe(false);
		expect(isAllowedImageUrl(42 as unknown as string)).toBe(false);
	});
});

describe("extractImageUrls", () => {
	it("extracts a single image URL from markdown", () => {
		expect(extractImageUrls("![alt text](/api/images/photo.png)")).toEqual([
			"/api/images/photo.png",
		]);
	});

	it("extracts multiple image URLs in order", () => {
		const md = "![a](/api/images/one.jpg) some text ![b](/api/images/two.png)";
		expect(extractImageUrls(md)).toEqual([
			"/api/images/one.jpg",
			"/api/images/two.png",
		]);
	});

	it("returns empty array when no images are present", () => {
		expect(extractImageUrls("Just some plain text")).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		expect(extractImageUrls("")).toEqual([]);
	});

	it("handles image with empty alt text", () => {
		expect(extractImageUrls("![](/api/images/no-alt.png)")).toEqual([
			"/api/images/no-alt.png",
		]);
	});

	it("does not extract inline links (only image syntax)", () => {
		expect(extractImageUrls("[link text](https://example.com)")).toEqual([]);
	});

	it("extracts URL from an image block surrounded by other markdown", () => {
		const md =
			"# Heading\n\nSome paragraph.\n\n![screenshot](/api/images/s.webp)\n\nMore text.";
		expect(extractImageUrls(md)).toEqual(["/api/images/s.webp"]);
	});
});
