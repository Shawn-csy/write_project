const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 1091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger scripts

// Database Setup
const dbPath = process.env.DB_PATH || path.join(__dirname, 'scripts.db');
const db = new Database('scripts.db');
db.prepare(`
  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    ownerId TEXT,
    title TEXT,
    content TEXT,
    createdAt INTEGER,
    lastModified INTEGER,
    isPublic INTEGER DEFAULT 0,
    type TEXT DEFAULT 'script',
    folder TEXT DEFAULT '/'
  )
`).run();

// Migration helper
const migrate = () => {
  try {
    db.prepare("ALTER TABLE scripts ADD COLUMN isPublic INTEGER DEFAULT 0").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE scripts ADD COLUMN type TEXT DEFAULT 'script'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE scripts ADD COLUMN folder TEXT DEFAULT '/'").run();
  } catch (e) {}
};
migrate();

console.log('Database initialized at', dbPath);

// Routes

// Root/Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    version: '1.0.0'
  });
});

// GET /api/public-scripts - List all public scripts
app.get('/api/public-scripts', (req, res) => {
  const stmt = db.prepare('SELECT id, ownerId, title, lastModified, isPublic, type, folder FROM scripts WHERE isPublic = 1 ORDER BY lastModified DESC');
  const scripts = stmt.all();
  res.json(scripts);
});

// GET /api/public-scripts/:id - Get a single public script
app.get('/api/public-scripts/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM scripts WHERE id = ? AND isPublic = 1');
  const script = stmt.get(id);

  if (!script) return res.status(404).json({ error: 'Script not found or private' });
  res.json(script);
});

// GET /api/scripts - List all scripts for a user
app.get('/api/scripts', (req, res) => {
  const ownerId = req.headers['x-user-id'];
  if (!ownerId) return res.status(401).json({ error: 'Missing X-User-ID header' });

  const stmt = db.prepare('SELECT id, ownerId, title, lastModified, isPublic, type, folder FROM scripts WHERE ownerId = ? ORDER BY lastModified DESC');
  const scripts = stmt.all(ownerId);
  res.json(scripts);
});

// GET /api/scripts/:id - Get a single script
app.get('/api/scripts/:id', (req, res) => {
  const ownerId = req.headers['x-user-id'];
  const { id } = req.params;
  if (!ownerId) return res.status(401).json({ error: 'Missing X-User-ID header' });

  const stmt = db.prepare('SELECT * FROM scripts WHERE id = ? AND ownerId = ?');
  const script = stmt.get(id, ownerId);

  if (!script) return res.status(404).json({ error: 'Script not found' });
  res.json(script);
});

// POST /api/scripts - Create a new script
app.post('/api/scripts', (req, res) => {
  const ownerId = req.headers['x-user-id'];
  if (!ownerId) return res.status(401).json({ error: 'Missing X-User-ID header' });

  const { title, type, folder } = req.body;
  const id = Math.random().toString(36).substr(2, 9); // Simple ID generation
  const now = Date.now();

  const stmt = db.prepare('INSERT INTO scripts (id, ownerId, title, content, createdAt, lastModified, type, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, ownerId, title || 'Untitled', '', now, now, type || 'script', folder || '/');

  res.json({ id, title, content: '', lastModified: now, type: type || 'script', folder: folder || '/' });
});

// PUT /api/scripts/:id - Update a script
app.put('/api/scripts/:id', (req, res) => {
  const ownerId = req.headers['x-user-id'];
  const { id } = req.params;
  const { content, title, isPublic, folder, type } = req.body;
  
  console.log(`[PUT] Update script ${id} params:`, { contentLen: content?.length, title, isPublic, folder, type });

  if (!ownerId) return res.status(401).json({ error: 'Missing X-User-ID header' });

  const now = Date.now();

  let query = 'UPDATE scripts SET lastModified = ?';
  const params = [now];

  if (content !== undefined) {
    query += ', content = ?';
    params.push(content);
  }
  if (title !== undefined) {
    query += ', title = ?';
    params.push(title);
  }
  if (isPublic !== undefined) {
    query += ', isPublic = ?';
    params.push(isPublic ? 1 : 0);
  }
  if (folder !== undefined) {
    query += ', folder = ?';
    params.push(folder);
  }
  if (type !== undefined) {
    query += ', type = ?';
    params.push(type);
  }

  query += ' WHERE id = ? AND ownerId = ?';
  params.push(id, ownerId);

  const stmt = db.prepare(query);
  const info = stmt.run(...params);

  if (info.changes === 0) return res.status(404).json({ error: 'Script not found or no changes made' });

  res.json({ success: true, lastModified: now });
});

// DELETE /api/scripts/:id - Delete a script
app.delete('/api/scripts/:id', (req, res) => {
  const ownerId = req.headers['x-user-id'];
  const { id } = req.params;
  if (!ownerId) return res.status(401).json({ error: 'Missing X-User-ID header' });

  const stmt = db.prepare('DELETE FROM scripts WHERE id = ? AND ownerId = ?');
  const info = stmt.run(id, ownerId);

  if (info.changes === 0) return res.status(404).json({ error: 'Script not found' });
  res.json({ success: true });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
