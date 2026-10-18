'use client';

import React from 'react';

interface MapFilterBoxProps {
  genres: string[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onReset: () => void;
  totalMatching: number;
  isDarkMode: boolean;
}

export default function MapFilterBox({
  genres,
  selectedGenres,
  onToggleGenre,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
  totalMatching,
  isDarkMode,
}: MapFilterBoxProps) {
  const hasActiveFilters = Boolean(
    selectedGenres.length > 0 || startDate || endDate
  );

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: '6px',
    border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
    background: isDarkMode ? '#111827' : 'white',
    color: isDarkMode ? '#f9fafb' : '#171717',
    fontSize: '12px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '260px',
        padding: '14px',
        borderRadius: '10px',
        background: isDarkMode ? '#1f2937' : 'white',
        color: isDarkMode ? '#f9fafb' : '#171717',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        fontSize: '13px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <strong style={{ fontSize: '14px' }}>Filter Events</strong>
        <span style={{ fontSize: '12px', opacity: 0.75 }}>
        </span>
      </div>

      {/* Date Interval Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontWeight: 600 }}>Date</span>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>From</span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onStartDateChange(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>To</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onEndDateChange(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Scrollable Genre Checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600 }}>Genres</span>
          {selectedGenres.length > 0 && (
            <span style={{ fontSize: '11px', opacity: 0.75 }}>
              {selectedGenres.length} selected
            </span>
          )}
        </div>

        <div
          style={{
            maxHeight: '160px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '8px',
            borderRadius: '6px',
            border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
            background: isDarkMode ? '#111827' : '#f9fafb',
          }}
        >
          {genres.length === 0 ? (
            <span style={{ fontSize: '12px', opacity: 0.6 }}>
              No genres available
            </span>
          ) : (
            genres.map((genre) => {
              const isChecked = selectedGenres.includes(genre);
              return (
                <label
                  key={genre}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '12px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleGenre(genre)}
                    style={{
                      width: '15px',
                      height: '15px',
                      margin: 0,
                      cursor: 'pointer',
                      accentColor: '#2563eb',
                    }}
                  />
                  <span style={{ lineHeight: 1.2 }}>{genre}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          style={{
            marginTop: '2px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: 0,
            background: '#2563eb',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
