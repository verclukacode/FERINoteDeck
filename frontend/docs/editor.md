# NoteDeck note editor

The note panel hosts a **block-based editor**. A note is a list of blocks while you
edit it, but it is **stored as a single markdown string** in `Page.content` — there is
no per-block persistence. Code lives in `src/features/notes/editor/`.

## Block types

| Type | What it is | Markdown line |
|---|---|---|
| `h1` | Heading 1 | `# text` |
| `h2` | Heading 2 | `## text` |
| `text` | Paragraph | `text` |
| `bullet` | Bullet list item | `- text` |
| `numbered` | Numbered list item | `1. text` (number = position in the run) |
| `task` | Checklist item | `- [ ] text` / `- [x] text` |
| `image` | Image | `![caption](/api/images/…)` |
| `separator` | Hand-drawn divider | `---` |

`text`, `bullet`, `numbered` and `task` support inline **bold** (`**…**`) and
auto-detected URL links. Headings are plain text.

## Editing UX

- **Enter** — at the start of a non-empty block inserts an empty block above; in the
  middle splits the block; at the end creates a new block after. On an empty
  list/numbered/checklist item it converts the item back to plain text.
- **Backspace at the start of a block** — an empty list/checklist item becomes plain
  text; a non-empty one becomes plain text keeping its content; an empty plain block is
  deleted; a non-empty plain block merges into the block above.
- **Auto-format** — typing a prefix converts a plain block: `# `, `## `, `- `, `1. `,
  `[] ` (checklist), `---` (separator).
- **Slash menu** — press `/` on an empty block to pick any block type (the way to
  insert an image or a separator).
- **Bold** — select text and press Cmd/Ctrl+B, or use the floating toolbar.
- **Links** — URLs colour automatically; Cmd/Ctrl+click opens them.
- **Alt+↑ / Alt+↓** — move the current block up/down.
- **Checklist** — click the checkbox; checked items show strikethrough.
- **Image** — inserted via the slash menu; upload a file — it is uploaded to
  `/api/images` and stored server-side; the markdown holds a `![caption](/api/images/…)`
  URL. Very large images are rejected.

## Storage format

`Page.content` is a markdown string wrapped in a sentinel so the app recognises it as
NoteDeck editor content:

```
<<<NoteDeckMD>>>
# Tropski pas
## Kje se nahaja
...
<<<NoteDeckMD>>>
```

- On opening a page, `markdown.js` `parse()` strips the sentinel and turns the body into
  blocks (it also tolerates content without the sentinel, e.g. older seed data).
- On editing, the block array is serialized back with `serialize()` and saved — debounced
  (~500 ms), and flushed immediately when you switch pages — through the
  `updatePageContent` context action → `notesService.updatePage(id, { content })`. The
  whole document is written every time; there are no per-block updates.
- **Round-trip escaping** — a plain `text` block whose line would otherwise look like a
  marker (e.g. you literally type `# hello`) is saved with a leading backslash
  (`\# hello`) and un-escaped on load, so it stays plain text across reloads.

## Files

- `blockModel.js` — block shape + type constants + `createBlock`.
- `markdown.js` — `serialize` / `parse` (the sentinel + escaping logic).
- `inlineFormat.js` — bold/link HTML rendering and caret helpers.
- `dividerShape.js` — the separator's SVG squiggle path.
- `BlockEditor.jsx` — container: block state, cross-block keyboard logic, debounced save.
- `EditorBlock.jsx` — one block: contentEditable, auto-format, bold, image, separator.
- `SlashMenu.jsx` / `SelectionToolbar.jsx` — the `/` menu and the bold toolbar.
