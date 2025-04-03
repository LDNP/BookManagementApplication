require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(bodyParser.json());

// Initialize database
const db = new sqlite3.Database('./books.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL
  )`, () => {
    db.get('SELECT COUNT(*) as count FROM books', (err, row) => {
      if (err) return console.error('Error checking books table:', err);
      if (row.count === 0) {
        const sampleBooks = [
          ['1984', 'George Orwell'],
          ['To Kill a Mockingbird', 'Harper Lee'],
          ['Pride and Prejudice', 'Jane Austen'],
          ['The Great Gatsby', 'F. Scott Fitzgerald'],
          ['Moby Dick', 'Herman Melville']
        ];
        sampleBooks.forEach(([title, author]) => {
          db.run('INSERT INTO books (title, author) VALUES (?, ?)', [title, author]);
        });
        console.log('Sample books inserted into the database.');
      }
    });
  });
});

// API routes
app.get('/books', (_, res) => {
  db.all('SELECT * FROM books', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching books' });
    res.json(rows);
  });
});

app.get('/books/search', (req, res) => {
  const query = req.query.q || '';
  const sql = `SELECT * FROM books WHERE title LIKE ? OR author LIKE ?`;
  const param = `%${query}%`;
  db.all(sql, [param, param], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Search failed' });
    res.json(rows);
  });
});

app.post('/books', (req, res) => {
  const { title, author } = req.body;
  db.run('INSERT INTO books (title, author) VALUES (?, ?)', [title, author], function (err) {
    if (err) return res.status(500).json({ message: 'Insert error' });
    res.status(201).json({ id: this.lastID, title, author });
  });
});

app.put('/books/:id', (req, res) => {
  const { title, author } = req.body;
  db.run('UPDATE books SET title = ?, author = ? WHERE id = ?', [title, author, req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Update error' });
    res.status(200).json({ id: req.params.id, title, author });
  });
});

app.delete('/books/:id', (req, res) => {
  db.run('DELETE FROM books WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Delete error' });
    res.status(204).send();
  });
});

// Serve frontend build in production
if (isProd) {
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

// Start server (HTTPS for production, HTTP for development)
let server;
if (isProd) {
  const sslPath = path.join(__dirname, 'privatekey.pem');
  const certPath = path.join(__dirname, 'server.crt');

  const options = {
    key: fs.readFileSync(sslPath),
    cert: fs.readFileSync(certPath),
  };

  server = https.createServer(options, app).listen(8443, () => {
    console.log('Production HTTPS server running on https://localhost:8443');
  });
} else {
  const PORT = process.env.PORT || 5000;
  server = app.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
  });
}

module.exports = { app, server };