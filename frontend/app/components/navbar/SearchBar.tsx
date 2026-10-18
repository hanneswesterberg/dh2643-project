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
      setResults(null);
      setIsOpen(false);
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
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <form onSubmit={handleFormSubmit}>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => {
            if (results) setIsOpen(true);
          }}
          placeholder="Search genres, artists or venues..."
          className={`w-full rounded-full border px-5 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
            isDarkMode
              ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400'
              : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
          }`}
        />
        <button
          type="submit"
          className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition"
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
        <div className="absolute left-0 top-full mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl z-50">
          {hasNoResults ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No results found for &quot;<span className="font-semibold text-gray-700">{term}</span>&quot;
            </div>
          ) : (
            <>
              {results.artists.length > 0 && (
                <div className="p-2">
                  <h3 className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Artists
                  </h3>
                  <ul>
                    {results.artists.map((artist) => (
                      <li key={`artist-${artist.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelect(artist.name)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition text-gray-800"
                        >
                          {artist.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.venues.length > 0 && (
                <div className="p-2 border-t border-gray-50">
                  <h3 className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Venues
                  </h3>
                  <ul>
                    {results.venues.map((venue) => (
                      <li key={`venue-${venue.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelect(venue.name)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition text-gray-800"
                        >
                          {venue.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.genres.length > 0 && (
                <div className="p-2 border-t border-gray-50">
                  <h3 className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Genres
                  </h3>
                  <ul>
                    {results.genres.map((genre) => (
                      <li key={`genre-${genre.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelect(genre.name)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition text-gray-800"
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
