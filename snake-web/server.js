const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const SCORES_FILE = path.join(__dirname, 'scores.json');

// Ensure scores file exists
if (!fs.existsSync(SCORES_FILE)) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify([]));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read scores
function readScores() {
  try {
    const data = fs.readFileSync(SCORES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading scores:', err);
    return [];
  }
}

// Helper to write scores atomically
function writeScores(scores) {
  try {
    const tempFile = `${SCORES_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(scores, null, 2));
    fs.renameSync(tempFile, SCORES_FILE);
  } catch (err) {
    console.error('Error writing scores:', err);
  }
}

// API: Get top 10 scores
app.get('/api/scores', (req, res) => {
  const scores = readScores();
  const topScores = scores
    .sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date))
    .slice(0, 10);
  res.json(topScores);
});

// API: Submit a score
app.post('/api/scores', (req, res) => {
  const { name, score } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Valid score is required' });
  }

  const scores = readScores();
  const newEntry = {
    name: name.trim().substring(0, 15),
    score,
    date: new Date().toISOString()
  };

  scores.push(newEntry);
  writeScores(scores);

  res.status(201).json(newEntry);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, HOST, () => {
  console.log(`Snake running on http://${HOST}:${PORT}`);
});
