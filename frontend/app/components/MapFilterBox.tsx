'use client';

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

  return (
    <div
      className={`map-filter${isDarkMode ? ' map-filter--dark' : ''}`}
    >
      {/* Header */}
      <div className="map-filter__header">
        <strong className="map-filter__title">Filters</strong>
        <span className="map-filter__count">
          {totalMatching} matching
        </span>
      </div>

      {/* Date Interval Filter */}
      <div className="map-filter__section">
        <span className="map-filter__section-title">Date</span>
        <label className="map-filter__field">
          <span className="map-filter__field-label">From</span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="map-filter__input"
          />
        </label>
        <label className="map-filter__field">
          <span className="map-filter__field-label">To</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="map-filter__input"
          />
        </label>
      </div>

      {/* Scrollable Genre Checkboxes */}
      <div className="map-filter__section">
        <div className="map-filter__header">
          <span className="map-filter__section-title">Genres</span>
          {selectedGenres.length > 0 && (
            <span className="map-filter__selected-count">
              {selectedGenres.length} selected
            </span>
          )}
        </div>

        <div className="map-filter__genres">
          {genres.length === 0 ? (
            <span className="map-filter__empty">
              No genres available
            </span>
          ) : (
            genres.map((genre) => {
              const isChecked = selectedGenres.includes(genre);
              return (
                <label
                  key={genre}
                  className="map-filter__genre"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleGenre(genre)}
                    className="map-filter__checkbox"
                  />
                  <span className="map-filter__genre-label">{genre}</span>
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
          className="map-filter__reset"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
