require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const initSqlJs = require('sql.js');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: 'https://34.251.18.39:8443',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(bodyParser.json());

let db;
let SQL;

async function initializeDatabase() {
  try {
    SQL = await initSqlJs();
    db = new SQL.Database();
    db.run(`CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL
    )`);

    const result = db.exec('SELECT COUNT(*) as count FROM books');
    const count = result[0].values[0][0];

    if (count === 0) {
      const sampleBooks = [
        ['1984', 'George Orwell'],
        ['To Kill a Mockingbird', 'Harper Lee'],
        ['Pride and Prejudice', 'Jane Austen']
      ];

      db.run("BEGIN TRANSACTION");
      const stmt = db.prepare('INSERT INTO books (title, author) VALUES (?, ?)');
      sampleBooks.forEach(([title, author]) => {
        try {
          stmt.run([title, author]);
        } catch (err) {
          console.error('Error inserting sample book:', err);
        }
      });
      stmt.free();
      db.run("COMMIT");

      console.log('Sample books inserted');
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

app.get('/books/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const param = `%${query}%`;

    const stmt = db.prepare(`
      SELECT * FROM books 
      WHERE title LIKE ? OR author LIKE ?
    `);

    const result = stmt.all([param, param]);
    stmt.free();

    res.json(result);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search error', error: err.message });
  }
});

app.get('/books', (_, res) => {
  try {
    const result = db.exec("SELECT * FROM books");
    const rows = result[0] ? result[0].values.map((row) => ({
      id: row[0],
      title: row[1],
      author: row[2]
    })) : [];

    res.json(rows);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ message: 'Error fetching books', error: err.message });
  }
});

app.post('/books', (req, res) => {
  try {
    const { title, author } = req.body;

    const stmt = db.prepare("INSERT INTO books (title, author) VALUES (?, ?)");
    stmt.run([title, author]);
    stmt.free();

    const lastId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
    res.status(201).json({ id: lastId, title, author });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ message: 'Insert error', error: err.message });
  }
});

app.put('/books/:id', (req, res) => {
  try {
    const { title, author } = req.body;
    const { id } = req.params;

    const stmt = db.prepare("UPDATE books SET title = ?, author = ? WHERE id = ?");
    stmt.run([title, author, id]);
    stmt.free();

    const result = db.exec(`SELECT changes() as changes`);
    const changes = result[0].values[0][0];

    if (changes === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.status(200).json({ id: parseInt(id), title, author });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Update error', error: err.message });
  }
});

app.delete('/books/:id', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare("DELETE FROM books WHERE id = ?");
    stmt.run([id]);
    stmt.free();

    const result = db.exec(`SELECT changes() as changes`);
    const changes = result[0].values[0][0];

    if (changes === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Delete error', error: err.message });
  }
});

if (isProd) {
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

const PORT = process.env.PORT || 8443;

async function startServer() {
  await initializeDatabase();

  try {
    if (process.env.PRIVATE_KEY && process.env.SERVER) {
      const keyPath = path.join(__dirname, 'privatekey.pem');
      const certPath = path.join(__dirname, 'server.crt');

      fs.writeFileSync(keyPath, process.env.PRIVATE_KEY.replace(/\\n/g, '\n'));
      fs.writeFileSync(certPath, process.env.SERVER.replace(/\\n/g, '\n'));
    }

    const sslPath = process.env.HTTPS_KEY_PATH || path.join(__dirname, 'privatekey.pem');
    const certPath = process.env.HTTPS_CERT_PATH || path.join(__dirname, 'server.crt');

    if (fs.existsSync(sslPath) && fs.existsSync(certPath)) {
      const options = {
        key: fs.readFileSync(sslPath),
        cert: fs.readFileSync(certPath),
      };

      const server = https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
        console.log(`HTTPS server running on port ${PORT}`);
      });

      module.exports = { app, server, db };
    } else {
      console.log("SSL certificates not found, starting HTTP server instead");
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`HTTP server running on port ${PORT}`);
      });
      module.exports = { app, server, db };
    }
  } catch (error) {
    console.error("Error starting HTTPS server:", error);
    console.log("Falling back to HTTP server");
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`HTTP server running on port ${PORT}`);
    });
    module.exports = { app, server, db };
  }
}

startServer();