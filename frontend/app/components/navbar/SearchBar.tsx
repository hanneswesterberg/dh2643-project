//import React, { useState, useEffect } from 'react';
"use client"
import React from 'react';
import axios from 'axios';

/*const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      if (searchTerm) {
        try {
          const response = await axios.get(`http://127.0.0.1:3000/api/events/?search=${searchTerm}`); //change axios get to correct endpoint for events searching
          setResults(response.data);
        } catch (error) {
          console.error('Error fetching search results: ', error);
        }
      } else {
        setResults([]);
      }
    };

    const timerId = setTimeout(() => {
      fetchResults();
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  const handleSubmit = (event: { preventDefault: () => void; }) => { //make sure event type is not "any", change to relevant type
    event.preventDefault();
  };

  return (
    <div style={{ position: 'relative' }}>
      <form style={{ display: 'flex', alignItems: 'center' }} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search for products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 20px',
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            color: 'darkslategray',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          🔍
        </button>
      </form>
      {results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto',
          listStyle: 'none',
          margin: 0, 
          padding: 0,
        }}>
          {results.map((product) => (
            <li key={product.id} style={{
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'darkslategray',
              backgroundColor: 'white',
              cursor: 'pointer',
              borderBottom: '1px solid #ccc',
            }}>
              <a 
                href={`/product/${product.product_url}`}
                style={{
                  textDecoration: 'none', 
                  color: 'inherit', 
                  display: 'flex', 
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <img src={product.product_image} alt={product.name} style={{ width: '50px', height: 'auto' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                  <span>${product.price}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default SearchBar;*/


interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchBar({
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search genres, artists or venues..."
        className="w-full rounded-full border border-gray-300 bg-white px-5 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <svg
        className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
        />
      </svg>
    </div>
  );
}
export default SearchBar;