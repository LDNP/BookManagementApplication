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

// Initialize database with error handling
const db = new sqlite3.Database('./books.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database opened successfully');
  }
});

// Create table with improved error handling
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error creating books table:', err);
    } else {
      // Check if table is empty
      db.get('SELECT COUNT(*) as count FROM books', (err, row) => {
        if (err) {
          console.error('Error checking books table:', err);
          return;
        }
        
        if (row.count === 0) {
          const sampleBooks = [
            ['1984', 'George Orwell'],
            ['To Kill a Mockingbird', 'Harper Lee'],
            ['Pride and Prejudice', 'Jane Austen']
          ];
          
          const stmt = db.prepare('INSERT INTO books (title, author) VALUES (?, ?)');
          sampleBooks.forEach(([title, author]) => {
            stmt.run(title, author, (err) => {
              if (err) console.error('Error inserting sample book:', err);
            });
          });
          stmt.finalize();
        }
      });
    }
  });
});

// CRUD Routes with improved error handling
app.get('/books', (_, res) => {
  db.all('SELECT * FROM books', (err, rows) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.status(500).json({ message: 'Error fetching books', error: err.message });
    }
    res.json(rows);
  });
});

app.get('/books/search', (req, res) => {
  const query = req.query.q || '';
  const sql = `SELECT * FROM books WHERE title LIKE ? OR author LIKE ?`;
  const param = `%${query}%`;
  
  db.all(sql, [param, param], (err, rows) => {
    if (err) {
      console.error('Search failed:', err);
      return res.status(500).json({ message: 'Search failed', error: err.message });
    }
    res.json(rows);
  });
});

app.post('/books', (req, res) => {
  const { title, author } = req.body;
  
  db.run('INSERT INTO books (title, author) VALUES (?, ?)', [title, author], function(err) {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).json({ message: 'Insert error', error: err.message });
    }
    res.status(201).json({ id: this.lastID, title, author });
  });
});

app.put('/books/:id', (req, res) => {
  const { title, author } = req.body;
  const { id } = req.params;
  
  db.run('UPDATE books SET title = ?, author = ? WHERE id = ?', [title, author, id], function(err) {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).json({ message: 'Update error', error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(200).json({ id, title, author });
  });
});

app.delete('/books/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM books WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Delete error:', err);
      return res.status(500).json({ message: 'Delete error', error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(204).send();
  });
});

// Serve frontend build in production
if (isProd) {
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

// Start server
const PORT = process.env.PORT || 8443;

// Changed to always use HTTPS if certificates exist, regardless of NODE_ENV
try {
  const sslPath = process.env.HTTPS_KEY_PATH || path.join(__dirname, 'privatekey.pem');
  const certPath = process.env.HTTPS_CERT_PATH || path.join(__dirname, 'server.crt');
  
  if (fs.existsSync(sslPath) && fs.existsSync(certPath)) {
    const options = {
      key: fs.readFileSync(sslPath),
      cert: fs.readFileSync(certPath),
    };

    const server = https.createServer(options, app).listen(PORT, () => {
      console.log(`HTTPS server running on https://localhost:${PORT}`);
    });

    module.exports = { app, server, db };
  } else {
    console.log("SSL certificates not found, starting HTTP server instead");
    const server = app.listen(PORT, () => {
      console.log(`HTTP server running at http://localhost:${PORT}`);
    });
    module.exports = { app, server, db };
  }
} catch (error) {
  console.error("Error starting HTTPS server:", error);
  console.log("Falling back to HTTP server");
  const server = app.listen(PORT, () => {
    console.log(`HTTP server running at http://localhost:${PORT}`);
  });
  module.exports = { app, server, db };
}