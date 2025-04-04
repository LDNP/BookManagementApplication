import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Use a default base API URL if not set in environment
const API = process.env.REACT_APP_API_BASE || 'https://34.251.18.39:8443';

function App() {
  const [allBooks, setAllBooks] = useState([]); // Store all books
  const [displayedBooks, setDisplayedBooks] = useState([]); // Books to display
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all books when component mounts
  useEffect(() => {
    fetchBooks();
  }, []);

  // Client-side search implementation
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDisplayedBooks(allBooks); // Show all books when search is empty
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase().trim();
    const filtered = allBooks.filter(book => 
      book.title.toLowerCase().includes(lowercaseSearch) ||
      book.author.toLowerCase().includes(lowercaseSearch)
    );
    
    setDisplayedBooks(filtered);
  }, [searchTerm, allBooks]);

  // Fetch books function - still uses the backend API
  const fetchBooks = () => {
    axios.get(`${API}/books`)
      .then(res => {
        setAllBooks(res.data);
        setDisplayedBooks(res.data);
      })
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
          const updatedBook = res.data;
          // Update both book lists
          const updatedAllBooks = allBooks.map(b => 
            b.id === currentBookId ? updatedBook : b
          );
          setAllBooks(updatedAllBooks);
          
          // The displayed books list will be automatically updated by the search effect
          resetForm();
        })
        .catch(err => {
          console.error('Update error:', err);
        });
    } else {
      axios.post(`${API}/books`, book)
        .then(res => {
          // Add to all books
          setAllBooks([...allBooks, res.data]);
          // The displayed books list will be automatically updated by the search effect
          resetForm();
        })
        .catch(err => {
          console.error('Add book error:', err);
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
        // Remove from all books
        const updatedAllBooks = allBooks.filter(b => b.id !== id);
        setAllBooks(updatedAllBooks);
        // The displayed books list will be automatically updated by the search effect
      })
      .catch(err => {
        console.error('Delete error:', err);
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
          {isEditing && (
            <button type="button" onClick={resetForm}>Cancel</button>
          )}
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
          {displayedBooks.length > 0 ? (
            displayedBooks.map(book => (
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