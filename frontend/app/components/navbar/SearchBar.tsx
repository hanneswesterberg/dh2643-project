"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchGlobal } from '../Lib/userAPI';

type SearchResult = { id: number; name: string };
type CategorizedResults = {
  artists: SearchResult[];
  genres: SearchResult[];
  venues: SearchResult[];
};

interface SearchBarProps {
  isDarkMode?: boolean;
}

export default function SearchBar({ isDarkMode = false }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [term, setTerm] = useState(searchParams.get('search') || '');
  const [results, setResults] = useState<CategorizedResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (term.trim().length < 2) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await searchGlobal(term);
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Search failed:", error);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [term]);

  const handleTermChange = (value: string) => {
    setTerm(value);
    if (value.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
    }
  };

  const handleSelect = (name: string) => {
    setTerm(name);
    setIsOpen(false);
    router.push(`/?search=${encodeURIComponent(name)}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (term.trim()) {
      router.push(`/?search=${encodeURIComponent(term.trim())}`);
    } else {
      router.push(`/`);
    }
  };

  const hasNoResults =
    results &&
    results.artists.length === 0 &&
    results.venues.length === 0 &&
    results.genres.length === 0;

  return (
    <div ref={wrapperRef} className="search-bar">
      <form onSubmit={handleFormSubmit}>
        <input
          type="text"
          value={term}
          onChange={(e) => handleTermChange(e.target.value)}
          onFocus={() => {
            if (results) setIsOpen(true);
          }}
          placeholder="Search genres, artists or venues..."
          className={`search-bar__input${isDarkMode ? ' search-bar__input--dark' : ''}`}
        />
        <button
          type="submit"
          className="search-bar__submit"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
            />
          </svg>
        </button>
      </form>

      {isOpen && results && (
        <div className="search-bar__results">
          {hasNoResults ? (
            <div className="search-bar__empty">
              No results found for &quot;<span className="search-bar__term">{term}</span>&quot;
            </div>
          ) : (
            <>
              {results.artists.length > 0 && (
                <div className="search-bar__category">
                  <h3 className="search-bar__category-title">
                    Artists
                  </h3>
                  <ul>
                    {results.artists.map((artist) => (
                      <li key={`artist-${artist.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelect(artist.name)}
                          className="search-bar__result"
                        >
                          {artist.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.venues.length > 0 && (
                <div className="search-bar__category search-bar__category--separated">
                  <h3 className="search-bar__category-title">
                    Venues
                  </h3>
                  <ul>
                    {results.venues.map((venue) => (
                      <li key={`venue-${venue.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelect(venue.name)}
                          className="search-bar__result"
                        >
                          {venue.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.genres.length > 0 && (
                <div className="search-bar__category search-bar__category--separated">
                  <h3 className="search-bar__category-title">
                    Genres
                  </h3>
                  <ul>
                    {results.genres.map((genre) => (
                      <li key={`genre-${genre.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelect(genre.name)}
                          className="search-bar__result"
                        >
                          {genre.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
