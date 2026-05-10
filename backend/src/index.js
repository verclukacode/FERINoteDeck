require('dotenv').config();
const express = require('express');
const cors = require('cors');
const notesRouter = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ name: 'NoteDeck API', status: 'ok' });
});

app.use('/api/notes', notesRouter);

app.listen(PORT, () => {
  console.log(`NoteDeck backend running on http://localhost:${PORT}`);
});
