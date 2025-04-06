const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const initSqlJs = require('sql.js');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// More flexible CORS configuration using environment variables
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://18.202.19.128:8443',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Add secure headers for all responses
app.use((req, res, next) => {
  res.set('X-Frame-Options', 'DENY');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  next();
});

let db;
let SQL;

// ✅ FIXED: Certificate processing function
function processCertificates(keyPath, certPath) {
  try {
    return {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8')
    };
  } catch (error) {
    console.error("Error reading SSL certificates:", error);
    return null;
  }
}

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
    const result = db.exec(`
      SELECT * FROM books 
      WHERE title LIKE '${param}' OR author LIKE '${param}'
    `);

    const rows = result[0] ? result[0].values.map((row) => ({
      id: row[0],
      title: row[1],
      author: row[2]
    })) : [];

    res.json(rows);
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

// Serve static files (e.g., sitemap.xml, robots.txt)
app.use(express.static(path.join(__dirname, 'public')));

if (isProd) {
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

const PORT = process.env.PORT || 8443;

async function startServer() {
  await initializeDatabase();

  const keyPath = process.env.SSL_KEY_PATH || path.resolve(__dirname, 'privatekey.pem');
  const certPath = process.env.SSL_CERT_PATH || path.resolve(__dirname, 'server.crt');

  try {
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const processedCertificates = processCertificates(keyPath, certPath);

      if (processedCertificates) {
        const options = {
          key: processedCertificates.key,
          cert: processedCertificates.cert,
        };

        const server = https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
          console.log(`HTTPS server running on port ${PORT}`);
        });

        module.exports = { app, server, db };
      } else {
        console.log("Failed to process SSL certificates, falling back to HTTP server");
        fallbackToHttpServer();
      }
    } else {
      console.log("SSL certificates not found, starting HTTP server instead");
      fallbackToHttpServer();
    }
  } catch (error) {
    console.error("Error starting HTTPS server:", error);
    console.log("Falling back to HTTP server");
    fallbackToHttpServer();
  }
}

function fallbackToHttpServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP server running on port ${PORT}`);
  });

  module.exports = { app, server, db };
}

startServer();