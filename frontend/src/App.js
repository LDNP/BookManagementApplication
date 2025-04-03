import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Use a default base API URL if not set in environment
const API = process.env.REACT_APP_API_BASE || 'https://localhost:8443';

function App() {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all books when component mounts
  useEffect(() => {
    fetchBooks();
  }, []);

  // Search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      fetchBooks(); // Fetch all books when search is cleared
      return;
    }

    axios
      .get(`${API}/books/search?q=${searchTerm.trim()}`)
      .then(res => setBooks(res.data))
      .catch(err => {
        console.error('Search error:', err);
        // Optionally show an error message to the user
      });
  }, [searchTerm]);

  // Fetch books function
  const fetchBooks = () => {
    axios.get(`${API}/books`)
      .then(res => setBooks(res.data))
      .catch(err => {
        console.error('Error fetching books:', err);
        // Optionally show an error message to the user
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const book = { title, author };

    if (isEditing) {
      axios.put(`${API}/books/${currentBookId}`, book)
        .then(res => {
          setBooks(books.map(b => (b.id === currentBookId ? res.data : b)));
          resetForm();
        })
        .catch(err => {
          console.error('Update error:', err);
          // Optionally show an error message to the user
        });
    } else {
      axios.post(`${API}/books`, book)
        .then(res => {
          setBooks([...books, res.data]);
          resetForm();
        })
        .catch(err => {
          console.error('Add book error:', err);
          // Optionally show an error message to the user
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
    axios.delete(`${API}/books/${id}`)
      .then(() => {
        setBooks(books.filter(b => b.id !== id));
      })
      .catch(err => {
        console.error('Delete error:', err);
        // Optionally show an error message to the user
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
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Title" 
            required 
          />
          <input 
            value={author} 
            onChange={e => setAuthor(e.target.value)} 
            placeholder="Author" 
            required 
          />
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
            <li>{searchTerm ? 'No matching books found.' : 'No books available.'}</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default App;