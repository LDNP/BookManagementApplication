import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE || '';

function App() {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Only run this when searchTerm changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setBooks([]);
      return;
    }

    axios
      .get(`${API}/books/search?q=${searchTerm.trim()}`)
      .then(res => setBooks(res.data))
      .catch(err => console.error('Search error:', err));
  }, [searchTerm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const book = { title, author };

    if (isEditing) {
      axios.put(`${API}/books/${currentBookId}`, book).then(res => {
        setBooks(books.map(b => (b.id === currentBookId ? res.data : b)));
        resetForm();
      });
    } else {
      axios.post(`${API}/books`, book).then(res => {
        setBooks([...books, res.data]);
        resetForm();
      });
    }
  };

  const handleEdit = (book) => {
    setTitle(book.title);
    setAuthor(book.author);
    setIsEditing(true);
    setCurrentBookId(book.id);
  };

  const handleDelete = (id) => {
    axios.delete(`${API}/books/${id}`).then(() => {
      setBooks(books.filter(b => b.id !== id));
    });
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsEditing(false);
    setCurrentBookId(null);
  };

  return (
    <div className="container">
      <h1>Book Manager</h1>

      <div className="form-section">
        <form onSubmit={handleSubmit}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author" />
          <button type="submit">{isEditing ? 'Update' : 'Add'} Book</button>
        </form>
      </div>

      <hr className="divider" />

      <div className="list-section">
        <h2>Books List</h2>

        <input
          type="text"
          className="search-input"
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <ul>
          {books.length > 0 ? (
            books.map(book => (
              <li key={book.id}>
                <strong>{book.title}</strong> by {book.author}
                <button onClick={() => handleEdit(book)}>Edit</button>
                <button onClick={() => handleDelete(book.id)}>Delete</button>
              </li>
            ))
          ) : (
            searchTerm && <li>No matching books found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default App;