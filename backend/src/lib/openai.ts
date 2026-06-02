import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { ExtractedFile } from "./fileExtraction";

let client: OpenAI | null = null;
function getClient(): OpenAI {
	if (!client) {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
		client = new OpenAI({ apiKey });
	}
	return client;
}

const SYSTEM_PROMPT = `You turn study materials into a single Markdown note for the NoteDeck block editor.

LANGUAGE: Write BOTH the title and the content in the same language as the source
materials and the user prompt. If the sources are in Slovenian, write Slovenian. Never
translate.

Use the FULL toolbox of block types — pick whichever fits each piece of content. A good
note mixes them: headings to structure, paragraphs to explain, bullets/numbered lists
for enumerations, tasks for action items, images where they reinforce a point,
separators to break sections.

Output ONLY these block forms, each on its OWN line, starting at column 0 (no leading
whitespace, no indentation):

- "# Heading 1" — for the note's top-level sections.
- "## Heading 2" — for sub-sections under a # heading.
- **There are ONLY two heading levels.** NEVER use "### Heading 3", "#### Heading 4", or
  deeper. If a source has more than two levels of nesting, flatten it: promote the third
  level to a "## Heading 2" with a leading qualifier, or use a "---" separator + a new
  "## Heading 2", or just merge it into a paragraph. A literal "### " will render as
  plain text, not a heading — the parser doesn't recognise it.
- Plain text paragraphs — for explanations, definitions, summaries. Keep paragraphs to
  one line (no internal line breaks).
- "- bullet item" — for unordered enumerations. MUST be hyphen-space. Never "*", "•", "+".
- "1. numbered item" — for ordered steps / ranked items. MUST be "digit + . + space".
  Never "1)" or "(1)". Numbers must be sequential within a run.
- "- [ ] task" or "- [x] task" — for action items, follow-ups, exam todos. Use the
  checked form ("- [x] ...") when the source clearly states something is done; otherwise
  unchecked ("- [ ] ...").
- "![CAPTION](url)" — embed an image from IMAGE_URLS verbatim. The CAPTION (between the
  square brackets) MUST be a meaningful description of what the image actually shows,
  written in the note's language. NEVER write "alt text", "image", "figure", or the
  filename. If you don't know what's in the image, write a short description of the
  topic it illustrates. The caption appears under the image in the editor — make it
  useful to the reader. Use ONLY URLs from the IMAGE_URLS list. Never invent URLs.
- "---" separator — USE THIS FREELY between thematic sections, between a heading block
  and a different topic that follows it, or to break up a long note into visually
  distinct parts. A separator is a single line with just three hyphens. Don't put one at
  the very start or end of the note, but anywhere in the middle is fair game and often
  improves readability.

ABSOLUTELY NO nested or indented lists. If a source contains a sub-bullet, flatten it
into a separate top-level bullet (or merge it into the parent line). Every list item
starts at column 0.

Do NOT use bold/italic markdown, code fences, tables, footnotes, or inline links — they
are not supported. Do NOT include any prefaces, explanations, or trailing commentary.

Organise the note according to the user's prompt and the source materials.

Return your response as JSON with fields { title, content } where title is a concise
note title (no longer than 80 characters, same language as the content) and content is
the full markdown body.`;

export type GeneratedNote = { title: string; content: string };

const MIME_BY_EXT: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
};

// OpenAI Vision can't fetch a private localhost URL — instead inline the
// image as a base64 data URL so the bytes travel with the request.
async function fileToDataUrl(filepath: string): Promise<string | null> {
	try {
		const buf = await fs.readFile(filepath);
		const ext = path.extname(filepath).toLowerCase();
		const mime = MIME_BY_EXT[ext] ?? "image/png";
		return `data:${mime};base64,${buf.toString("base64")}`;
	} catch {
		return null;
	}
}

export async function generateNoteFromFiles(
	prompt: string,
	files: ExtractedFile[],
): Promise<GeneratedNote> {
	const imageFiles = files.filter((f) => f.kind === "image" && f.imageUrl);
	const textFiles = files.filter((f) => f.kind !== "image" && f.text);

	const imageUrlList = imageFiles
		.map((f) => `- ${f.imageUrl}  (originally: ${f.filename})`)
		.join("\n");
	const sourceText = textFiles
		.map((f) => `### Source: ${f.filename}\n${f.text}`)
		.join("\n\n");

	const userText = [
		"IMAGE_URLS (use these exact URLs verbatim in any ![](...) blocks):",
		imageUrlList || "(none)",
		"",
		"SOURCE MATERIALS:",
		sourceText || "(no text-based files were attached)",
		"",
		"USER PROMPT:",
		prompt || "(none — produce a balanced summary of all source materials)",
	].join("\n");

	const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
		{ type: "text", text: userText },
	];
	for (const img of imageFiles) {
		if (!img.imagePath) continue;
		const dataUrl = await fileToDataUrl(img.imagePath);
		if (!dataUrl) continue;
		userContent.push({
			type: "image_url",
			image_url: { url: dataUrl },
		});
	}

	const completion = await getClient().chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: userContent },
		],
		response_format: {
			type: "json_schema",
			json_schema: {
				name: "generated_note",
				strict: true,
				schema: {
					type: "object",
					additionalProperties: false,
					required: ["title", "content"],
					properties: {
						title: { type: "string" },
						content: { type: "string" },
					},
				},
			},
		},
	});

	const raw = completion.choices[0]?.message?.content;
	if (!raw) throw new Error("OpenAI returned an empty response");
	let parsed: GeneratedNote;
	try {
		parsed = JSON.parse(raw) as GeneratedNote;
	} catch {
		throw new Error("OpenAI returned malformed JSON");
	}
	const title = (parsed.title ?? "Imported note").slice(0, 200).trim();
	const body = normaliseForBlockEditor((parsed.content ?? "").trim());
	const wrapped = `<<<NoteDeckMD>>>\n${body}\n<<<NoteDeckMD>>>`;
	return { title, content: wrapped };
}

// Safety net: the editor's parser only accepts a fixed set of block forms,
// but LLMs have strong markdown habits — they slip ### headings, * bullets,
// "1)" numbered items, and indented sub-lists through despite the system
// prompt. Normalise per line so the editor sees something it can render.
function normaliseForBlockEditor(body: string): string {
	return body
		.split("\n")
		.map((line) => {
			// Strip leading whitespace — block editor doesn't support nesting, so
			// indented "  - sub-item" becomes a top-level "- sub-item".
			const stripped = line.replace(/^[ \t]+/, "");
			// Demote h3+ to h2 (parser only handles # and ##).
			const heading = stripped.match(/^#{3,6}\s+(.*)$/);
			if (heading) return `## ${heading[1]}`;
			// "* item" or "+ item" → "- item".
			const altBullet = stripped.match(/^[*+]\s+(.*)$/);
			if (altBullet) return `- ${altBullet[1]}`;
			// "1) item" → "1. item".
			const parenNum = stripped.match(/^(\d+)\)\s+(.*)$/);
			if (parenNum) return `${parenNum[1]}. ${parenNum[2]}`;
			return stripped;
		})
		.join("\n");
}
