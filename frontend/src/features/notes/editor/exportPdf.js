import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { parse } from "./markdown.js";

// Build styled HTML string from blocks — mirrors the app's visual hierarchy
function blocksToHtml(blocks, separatorImg) {
	let underH1 = false;
	let underH2 = false;
	let numberedRun = 0;
	let currentDepth = 0;
	const lines = [];

	function getDepth(type) {
		if (type === "h1" || type === "separator") return 0;
		if (type === "h2") return underH1 ? 1 : 0;
		return (underH1 ? 1 : 0) + (underH2 ? 1 : 0);
	}

	function inline(content) {
		return (content || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/(?:https?:\/\/|www\.)[^\s<]+/g, (url) => {
				const href = url.startsWith("http") ? url : `https://${url}`;
				return `<a href="${href}" style="color:#2563eb">${url}</a>`;
			});
	}

	// Open/close wrapper divs to maintain continuous border-left
	function setDepth(newDepth) {
		while (currentDepth > newDepth) {
			lines.push("</div>");
			currentDepth--;
		}
		while (currentDepth < newDepth) {
			currentDepth++;
			lines.push(
				`<div style="border-left:2.5px solid #e5e5e5;padding-left:12px;margin-left:24px">`,
			);
		}
	}

	for (const block of blocks) {
		if (block.type !== "numbered") numberedRun = 0;
		const depth = getDepth(block.type);

		setDepth(depth);

		if (block.type === "h1") {
			underH1 = true;
			underH2 = false;
		} else if (block.type === "h2") {
			underH2 = true;
		} else if (block.type === "separator") {
			underH1 = false;
			underH2 = false;
		}

		switch (block.type) {
			case "h1":
				lines.push(
					`<h1 style="font-size:24px;font-weight:700;margin:16px 0 4px">${inline(block.content)}</h1>`,
				);
				break;
			case "h2":
				lines.push(
					`<h2 style="font-size:18px;font-weight:600;margin:12px 0 4px">${inline(block.content)}</h2>`,
				);
				break;
			case "bullet":
				lines.push(
					`<div style="display:flex;gap:8px;margin:3px 0"><span>•</span><span>${inline(block.content)}</span></div>`,
				);
				break;
			case "numbered":
				numberedRun++;
				lines.push(
					`<div style="display:flex;gap:8px;margin:3px 0"><span>${numberedRun}.</span><span>${inline(block.content)}</span></div>`,
				);
				break;
			case "task": {
				const checked = !!block.checked;
				const svgChecked = `<svg width="15" height="15" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><rect width="15" height="15" rx="2" fill="#3b82f6"/><polyline points="3,7.5 6,10.5 12,4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
				const svgEmpty = `<svg width="15" height="15" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><rect width="15" height="15" rx="2" fill="none" stroke="#bbb" stroke-width="1.5"/></svg>`;

				const addStrike = (html) =>
					html.replace(/(?<=>|^)([^<]+)(?=<|$)/g, (m) =>
						m
							.split("")
							.map((c) => (/\s/.test(c) ? c : `${c}̶`))
							.join(""),
					);

				const textHtml = checked
					? addStrike(inline(block.content))
					: inline(block.content);
				const textColor = checked ? "color:#777;" : "";

				lines.push(`<table style="border-collapse:collapse;margin:4px 0"><tr>
					<td style="padding:4px 8px 0 8px;width:15px;vertical-align:top">${checked ? svgChecked : svgEmpty}</td>
					<td style="padding:0;vertical-align:top;line-height:0.5;${textColor}">${textHtml}</td>
				</tr></table>`);
				break;
			}
			case "separator":
				lines.push(
					`<img src="${separatorImg}" style="width:100%;height:22px;margin:14px 0;display:block" />`,
				);
				break;
			case "image":
				if (block.imageUrl) {
					lines.push(
						`<div style="margin:8px 0"><img src="${block.imageUrl}" style="max-width:100%;border-radius:8px" /></div>`,
					);
				}
				break;
			default:
				if (block.content) {
					lines.push(`<p style="margin:3px 0">${inline(block.content)}</p>`);
				} else {
					lines.push(`<p style="margin:8px 0"></p>`);
				}
		}
	}

	setDepth(0); // close any remaining wrappers
	return lines.join("\n");
}

import { SQUIGGLE } from "./dividerShape.js";

function makeSeparatorImg() {
	const DPR = 3; // 3x resolution
	const W = 800 * DPR;
	const H = 22 * DPR;
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const ctx = c.getContext("2d");
	ctx.strokeStyle = "#c8c8c8";
	ctx.lineWidth = 1.2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.scale(W / 2000, DPR);
	ctx.stroke(new Path2D(SQUIGGLE));
	return c.toDataURL("image/png");
}

export async function exportNoteToPdf(page) {
	const blocks = parse(page.content || "");
	const separatorImg = makeSeparatorImg();

	// Build an off-screen div with the note content
	const container = document.createElement("div");
	container.style.cssText = `
		position: fixed;
		top: -9999px;
		left: 0;
		width: 794px;
		padding: 48px 64px;
		background: white;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		font-size: 15px;
		line-height: 1.7;
		color: #1a1a1a;
		box-sizing: border-box;
	`;

	container.innerHTML = `
		<h1 style="font-size:28px;font-weight:700;margin:0 0 12px">${page.title || "Untitled"}</h1>
		<hr style="border:none;border-top:1px solid #ddd;margin:0 0 20px" />
		${blocksToHtml(blocks, separatorImg)}
	`;

	document.body.appendChild(container);

	try {
		const canvas = await html2canvas(container, {
			scale: 2,
			useCORS: true,
			allowTaint: true,
			backgroundColor: "#ffffff",
			logging: false,
		});

		const imgData = canvas.toDataURL("image/png");
		const imgW = 210; // A4 mm
		const imgH = (canvas.height * imgW) / canvas.width;

		const pdf = new jsPDF({ unit: "mm", format: "a4" });
		const pageH = 297;
		let yPos = 0;

		// Split into pages if content is taller than A4
		while (yPos < imgH) {
			if (yPos > 0) pdf.addPage();
			pdf.addImage(imgData, "PNG", 0, -yPos, imgW, imgH);
			yPos += pageH;
		}

		const filename = `${(page.title || "note").replace(/[^a-z0-9]/gi, "_")}.pdf`;
		pdf.save(filename);
	} finally {
		document.body.removeChild(container);
	}
}
