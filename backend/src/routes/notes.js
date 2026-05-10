const express = require('express');
const router = express.Router();

let notes = [];
let nextId = 1;

router.get('/', (req, res) => {
  res.json(notes);
});

router.get('/:id', (req, res) => {
  const note = notes.find(n => n.id === Number(req.params.id));
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

router.post('/', (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const note = { id: nextId++, title, content: content || '', createdAt: new Date().toISOString() };
  notes.push(note);
  res.status(201).json(note);
});

router.put('/:id', (req, res) => {
  const note = notes.find(n => n.id === Number(req.params.id));
  if (!note) return res.status(404).json({ error: 'Note not found' });
  const { title, content } = req.body;
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  res.json(note);
});

router.delete('/:id', (req, res) => {
  const idx = notes.findIndex(n => n.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });
  const [removed] = notes.splice(idx, 1);
  res.json(removed);
});

module.exports = router;
