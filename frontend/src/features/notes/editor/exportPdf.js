import { jsPDF } from "jspdf";
import { parse } from "./markdown.js";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const MAX_W = PAGE_W - MARGIN * 2;

const DEPTH_MM = 6.5; // ~24px in mm

function stripInline(content) {
	return (content || "").replace(/\*\*(.+?)\*\*/g, "$1");
}

// Render a hand-drawn wave separator — fewer, rounder bumps
function makeSeparatorDataUrl(widthPx = 600) {
	const canvas = document.createElement("canvas");
	const h = 20;
	canvas.width = widthPx;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	ctx.strokeStyle = "#b0b0b0";
	ctx.lineWidth = 1.5;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	const mid = h / 2;
	const wavelength = 40;
	const amplitude = 4;
	ctx.beginPath();
	ctx.moveTo(0, mid);
	for (let x = 0; x <= widthPx; x += wavelength) {
		ctx.bezierCurveTo(
			x + wavelength * 0.25, mid - amplitude,
			x + wavelength * 0.75, mid + amplitude,
			x + wavelength, mid,
		);
	}
	ctx.stroke();
	return canvas.toDataURL("image/png");
}

export function exportNoteToPdf(page) {
	const blocks = parse(page.content || "");
	const doc = new jsPDF({ unit: "mm", format: "a4" });
	const separatorImg = makeSeparatorDataUrl(560);

	let y = MARGIN;

	function checkNewPage(needed = 8) {
		if (y + needed > PAGE_H - MARGIN) {
			doc.addPage();
			y = MARGIN;
		}
	}

	function addText(text, fontSize, options = {}) {
		const { bold = false, strikethrough = false, indent = 0, color = [26, 26, 26] } = options;
		doc.setFontSize(fontSize);
		doc.setFont("helvetica", bold ? "bold" : "normal");
		doc.setTextColor(...color);
		const lines = doc.splitTextToSize(text, MAX_W - indent);
		const lineH = fontSize * 0.45;
		checkNewPage(lineH * lines.length + 2);
		doc.text(lines, MARGIN + indent, y);
		if (strikethrough) {
			lines.forEach((line, i) => {
				const w = doc.getTextWidth(line);
				const ly = y + lineH * i - lineH * 0.28;
				doc.setDrawColor(...color);
				doc.setLineWidth(0.3);
				doc.line(MARGIN + indent, ly, MARGIN + indent + w, ly);
			});
		}
		y += lineH * lines.length;
		return lineH;
	}

	// Title
	addText(page.title || "Untitled", 22, { bold: true });
	y += 3;
	doc.setDrawColor(210, 210, 210);
	doc.setLineWidth(0.4);
	doc.line(MARGIN, y, PAGE_W - MARGIN, y);
	y += 7;

	let numberedRun = 0;
	let underH1 = false;
	let underH2 = false;

	function getDepth(type) {
		if (type === "h1") return 0;
		if (type === "h2") return underH1 ? 1 : 0;
		if (type === "separator") return 0;
		return (underH1 ? 1 : 0) + (underH2 ? 1 : 0);
	}

	function drawLeftBorder(depth, blockY, blockH) {
		if (depth === 0) return;
		doc.setDrawColor(220, 220, 220);
		doc.setLineWidth(0.6);
		for (let d = 0; d < depth; d++) {
			const bx = MARGIN + d * DEPTH_MM - 1.5;
			doc.line(bx, blockY - blockH, bx, blockY);
		}
	}

	for (const block of blocks) {
		if (block.type !== "numbered") numberedRun = 0;
		const depth = getDepth(block.type);
		const indent = depth * DEPTH_MM;

		// Update heading state
		if (block.type === "h1") { underH1 = true; underH2 = false; }
		else if (block.type === "h2") { underH2 = true; }
		else if (block.type === "separator") { underH1 = false; underH2 = false; }

		const startY = y;

		switch (block.type) {
			case "h1":
				y += 2;
				checkNewPage(10);
				addText(stripInline(block.content), 17, { bold: true, indent });
				y += 2;
				break;

			case "h2":
				y += 1;
				checkNewPage(8);
				addText(stripInline(block.content), 13, { bold: true, indent });
				y += 1;
				break;

			case "bullet":
				checkNewPage(6);
				doc.setFillColor(26, 26, 26);
				doc.circle(MARGIN + indent + 1.2, y - 1.5, 0.8, "F");
				addText(stripInline(block.content), 11, { indent: indent + 5 });
				y += 0.5;
				break;

			case "numbered":
				numberedRun += 1;
				checkNewPage(6);
				doc.setFontSize(11);
				doc.setFont("helvetica", "normal");
				doc.setTextColor(26, 26, 26);
				doc.text(`${numberedRun}.`, MARGIN + indent, y);
				addText(stripInline(block.content), 11, { indent: indent + 6 });
				y += 0.5;
				break;

			case "task": {
				checkNewPage(6);
				const checked = !!block.checked;
				const bx = MARGIN + indent;
				const by = y - 3.5;
				doc.setLineWidth(0.4);
				if (checked) {
					doc.setFillColor(59, 130, 246);
					doc.setDrawColor(59, 130, 246);
					doc.rect(bx, by, 3.5, 3.5, "F");
					doc.setTextColor(255, 255, 255);
					doc.setFontSize(7);
					doc.setFont("helvetica", "bold");
					doc.text("x", bx + 0.7, y - 0.7);
				} else {
					doc.setDrawColor(160, 160, 160);
					doc.rect(bx, by, 3.5, 3.5);
				}
				addText(stripInline(block.content), 11, {
					indent: indent + 6,
					strikethrough: checked,
					color: checked ? [160, 160, 160] : [26, 26, 26],
				});
				y += 0.5;
				break;
			}

			case "separator":
				y += 3;
				checkNewPage(8);
				doc.addImage(separatorImg, "PNG", MARGIN, y - 2, MAX_W, 6);
				y += 8;
				break;

			case "image":
				y += 2;
				break;

			default:
				if (block.content) {
					addText(stripInline(block.content), 11, { indent });
					y += 1;
				} else {
					y += 4;
				}
		}

		drawLeftBorder(depth, y, y - startY);
	}

	const filename = `${(page.title || "note").replace(/[^a-z0-9]/gi, "_")}.pdf`;
	doc.save(filename);
}
