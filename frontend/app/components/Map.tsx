'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import MapFilterBox from './MapFilterBox';
import { createPortal } from 'react-dom';
import 'ol/ol.css';

import type { Event, EventFeatureCollection } from '../lib/definition';

import Feature from 'ol/Feature';
import OLMap from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import StadiaMaps from 'ol/source/StadiaMaps';
import VectorSource from 'ol/source/Vector';

import { fromLonLat } from 'ol/proj';

import Point from 'ol/geom/Point';

import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';

type EventDetails = {
  ticksterId: string;
  name: string;
  start: string;
  end: string | null;
  ticketUrl: string;
  imageUrl: string;
  venueName: string;
  artists: string[];
  genre: string;
};

type VenueGroup = {
  key: string;
  name: string;
  coordinates: number[];
  stageNames: string[];
  events: Event[];
};

const EVENTS_PER_PAGE = 12;

function getEventGenres(event: Event): string[] {
  const genres = new Set<string>();
  const props = event.properties as Record<string, unknown>;

  const addGenreString = (val: unknown) => {
    if (typeof val === 'string') {
      val.split(',').forEach((part) => {
        const trimmed = part.trim();
        if (trimmed && trimmed.toLowerCase() !== 'unavailable') {
          genres.add(trimmed);
        }
      });
    } else if (val && typeof val === 'object' && 'name' in val) {
      const name = (val as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim()) {
        genres.add(name.trim());
      }
    }
  };

  // Check top-level event.properties.genre or event.properties.genres
  if (Array.isArray(props.genres)) {
    props.genres.forEach(addGenreString);
  } else {
    addGenreString(props.genre);
  }

  // Check nested genres inside event.properties.artists
  if (Array.isArray(props.artists)) {
    for (const artist of props.artists) {
      if (artist && typeof artist === 'object') {
        const artistObj = artist as Record<string, unknown>;
        if (Array.isArray(artistObj.genres)) {
          artistObj.genres.forEach(addGenreString);
        } else {
          addGenreString(artistObj.genre);
        }
      }
    }
  }

  return Array.from(genres);
}

function groupEventsByVenue(events: Event[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();

  for (const event of events) {
    const name = event.properties.venue_name.trim();
    const coordinates = event.geometry.coordinates;
    const key = coordinates.join(',');
    const group = groups.get(key);
    if (group) {
      group.events.push(event);
      if (
        !group.stageNames.some(
          (stageName) => stageName.toLocaleLowerCase() === name.toLocaleLowerCase()
        )
      ) {
        group.stageNames.push(name);
      }
      if (name.length < group.name.length) {
        group.name = name;
      }
    } else {
      groups.set(key, {
        key,
        name,
        coordinates,
        stageNames: [name],
        events: [event],
      });
    }
  }

  return Array.from(groups.values());
}

export default function ConcertMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const basemapLayerRef = useRef<TileLayer<StadiaMaps> | null>(null);
  const popupRef = useRef<Overlay | null>(null);
  const markerSourceRef = useRef<VectorSource<Feature<Point>> | null>(null);
  const markerFeaturesRef = useRef<Feature<Point>[]>([]);
  const eventsRef = useRef<EventFeatureCollection | null>(null);
  const venuesRef = useRef<Map<string, VenueGroup>>(new Map());
  const selectedEventRef =
    useRef<EventFeatureCollection['features'][number] | null>(null);
  const selectedVenueRef = useRef<VenueGroup | null>(null);
  const [events, setEvents] = useState<EventFeatureCollection | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<EventFeatureCollection['features'][number] | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueGroup | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [venueEventsPage, setVenueEventsPage] = useState(0);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupElement, setPopupElement] = useState<HTMLDivElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleToggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const eventDetails: EventDetails | null = selectedEvent
    ? {
        ticksterId: selectedEvent.properties.tickster_id,
        name: selectedEvent.properties.name,
        start: selectedEvent.properties.start,
        end: selectedEvent.properties.end,
        ticketUrl: selectedEvent.properties.ticket_url,
        imageUrl: selectedEvent.properties.image_url,
        venueName: selectedEvent.properties.venue_name,
        artists: selectedEvent.properties.artists.map((artist) => artist.name),
        genre: selectedEvent.properties.genre,
      }
    : null;

  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Events API request failed (${response.status})`);
        }

        const data: EventFeatureCollection = await response.json();
        eventsRef.current = data;
        setEvents(data);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Could not load events from the API.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadEvents();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const markerSource = new VectorSource<Feature<Point>>();
    markerSourceRef.current = markerSource;

    const eventsLayer = new VectorLayer({
      source: markerSource,
      style: (feature) =>
        new Style({
          image: new CircleStyle({
            radius: 11,
            fill: new Fill({ color: 'rgb(255, 132, 0)' }),
            stroke: new Stroke({ color: 'white', width: 2 }),
          }),
          text: new Text({
            text: String(feature.get('eventCount')),
            font: 'bold 11px Arial, sans-serif',
            fill: new Fill({ color: 'white' }),
            textAlign: 'center',
            textBaseline: 'middle',
          }),
        }),
    });

    const overlayElement = document.createElement('div');
    setPopupElement(overlayElement);

    const basemapLayer = new TileLayer({
      source: new StadiaMaps({ layer: 'alidade_smooth' }),
    });
    basemapLayerRef.current = basemapLayer;

    const popup = new Overlay({
      element: overlayElement,
      positioning: 'bottom-center',
      offset: [0, -18],
      stopEvent: true,
    });
    popupRef.current = popup;

    const map = new OLMap({
      target: mapRef.current,
      layers: [
        basemapLayer,
        eventsLayer,
      ],
      overlays: [popup],
      view: new View({
        center: fromLonLat([18.0686, 59.3293]),
        zoom: 11,
      }),
    });
    mapInstanceRef.current = map;

    const target = mapRef.current;
    const handlePointerMove = (event: { pixel: number[] }) => {
      const isMarkerHovered = map.hasFeatureAtPixel(event.pixel, {
        layerFilter: (layer) => layer === eventsLayer,
      });

      target.style.cursor = isMarkerHovered ? 'pointer' : '';
    };
    map.on('pointermove', handlePointerMove);

    const handleMapClick = (click: { pixel: number[] }) => {
      const clickedMarker = map.forEachFeatureAtPixel(
        click.pixel,
        (feature) => feature,
        { layerFilter: (layer) => layer === eventsLayer }
      );
      const venueKey = clickedMarker?.get('venueKey');
      const venue =
        typeof venueKey === 'string'
          ? venuesRef.current.get(venueKey)
          : undefined;

      if (!venue) {
        popup.setPosition(undefined);
        selectedEventRef.current = null;
        selectedVenueRef.current = null;
        setSelectedEvent(null);
        setSelectedVenue(null);
        setSelectedStage(null);
        return;
      }

      if (selectedVenueRef.current?.key === venue.key) {
        popup.setPosition(undefined);
        selectedEventRef.current = null;
        selectedVenueRef.current = null;
        setSelectedEvent(null);
        setSelectedVenue(null);
        setSelectedStage(null);
        return;
      }

      selectedVenueRef.current = venue;
      setSelectedVenue(venue);
      setSelectedStage(null);
      setVenueEventsPage(0);
      if (venue.events.length === 1) {
        popup.setPositioning('bottom-center');
        popup.setOffset([0, -18]);
        const [event] = venue.events;
        selectedEventRef.current = event;
        setSelectedEvent(event);
      } else {
        popup.setPositioning('center-center');
        popup.setOffset([0, 0]);
        selectedEventRef.current = null;
        setSelectedEvent(null);
      }
      popup.setPosition(fromLonLat(venue.coordinates));
    };
    map.on('singleclick', handleMapClick);

    const handlePointerLeave = () => {
      target.style.cursor = '';
    };
    target.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      map.un('pointermove', handlePointerMove);
      map.un('singleclick', handleMapClick);
      target.removeEventListener('pointerleave', handlePointerLeave);
      mapInstanceRef.current = null;
      basemapLayerRef.current = null;
      popupRef.current = null;
      markerSourceRef.current = null;
      markerFeaturesRef.current = [];
      setPopupElement(null);
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    basemapLayerRef.current?.setSource(
      new StadiaMaps({
        layer: isDarkMode ? 'alidade_smooth_dark' : 'alidade_smooth',
      })
    );
  }, [isDarkMode]);

  // Collect all unique genres and sort them alphabetically
  const availableGenres = useMemo(() => {
    if (!events) return [];
    const genreSet = new Set<string>();

    for (const event of events.features) {
      for (const genre of getEventGenres(event)) {
        genreSet.add(genre);
      }
    }

    return Array.from(genreSet).sort((a, b) => a.localeCompare(b));
  }, [events]);

  // Filter events by multi-genre selection and date interval
  const filteredFeatures = useMemo(() => {
    if (!events) return [];

    return events.features.filter((event) => {
      // Check Genre match (matches if no genres are checked, or if the event has at least one checked genre)
      if (selectedGenres.length > 0) {
        const eventGenres = getEventGenres(event);
        const hasMatchingGenre = eventGenres.some((g) =>
          selectedGenres.includes(g)
        );
        if (!hasMatchingGenre) return false;
      }

      // Check date interval match
      if (startDate || endDate) {
        const eventDate = new Date(event.properties.start).toLocaleDateString('sv-SE');
        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;
      }

      return true;
    });
  }, [events, selectedGenres, startDate, endDate]);

  useEffect(() => {
  if (!events) return;

  // Close any open popup when filters change so stale popups don't linger
  popupRef.current?.setPosition(undefined);
  selectedEventRef.current = null;
  selectedVenueRef.current = null;
  setSelectedEvent(null);
  setSelectedVenue(null);
  setSelectedStage(null);

  const venues = groupEventsByVenue(filteredFeatures);
  venuesRef.current = new Map(venues.map((venue) => [venue.key, venue]));
  const markerFeatures = venues.map(
    (venue) =>
      new Feature({
        geometry: new Point(fromLonLat(venue.coordinates)),
        venueKey: venue.key,
        eventCount: venue.events.length,
      })
  );
  markerFeaturesRef.current = markerFeatures;

  const markerSource = markerSourceRef.current;
  if (!markerSource) return;

  markerSource.clear(true);
  markerSource.addFeatures(markerFeatures);
}, [events, filteredFeatures]);

  return (
    <div
      data-theme={isDarkMode ? 'dark' : 'light'}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        colorScheme: isDarkMode ? 'dark' : 'light',
      }}
    >
    {/* Move OpenLayers zoom buttons to the bottom-right */}
    <style>{`
      .ol-zoom {
        top: auto !important;
        left: auto !important;
        bottom: 40px !important;
        right: 8px !important;
      }
    `}</style>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <MapFilterBox
        genres={availableGenres}
        selectedGenres={selectedGenres}
        onToggleGenre={handleToggleGenre}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onReset={() => {
          setSelectedGenres([]);
          setStartDate('');
          setEndDate('');
        }}
        totalMatching={filteredFeatures.length}
        isDarkMode={isDarkMode}
      />
      <button
        type="button"
        role="switch"
        aria-checked={isDarkMode}
        aria-label="Dark mode"
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => setIsDarkMode((enabled) => !enabled)}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
        }}
        className="theme-toggle"
        data-checked={isDarkMode}
      >
        <span className="theme-toggle__thumb" aria-hidden="true">
          {isDarkMode ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle
                cx="12"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </button>
      {(loading ||
        error ||
        (events !== null && events.features.length === 0)) && (
        <div
          role={error ? 'alert' : 'status'}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            padding: '10px 14px',
            borderRadius: '8px',
            background: isDarkMode ? '#1f2937' : 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            color: error ? '#b91c1c' : isDarkMode ? '#f9fafb' : '#171717',
          }}
        >
          {error ??
            (loading ? 'Loading events…' : 'No events available from the API.')}
        </div>
      )}
      {popupElement &&
        createPortal(
          <div
            style={
              selectedVenue && !selectedEvent
                ? {
                    position: 'relative',
                    width: 'min(360px, calc(100vw - 24px))',
                    height: 'min(360px, calc(100vw - 24px))',
                    overflow: 'visible',
                    color: isDarkMode ? '#f9fafb' : '#171717',
                    fontSize: '14px',
                    pointerEvents: 'auto',
                  }
                : {
                    minWidth: '220px',
                    maxWidth: '320px',
                    maxHeight: 'min(70vh, 480px)',
                    overflowY: 'auto',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: isDarkMode ? '#1f2937' : 'white',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
                    color: isDarkMode ? '#f9fafb' : '#171717',
                    fontSize: '14px',
                    pointerEvents: 'auto',
                  }
            }
          >
        {selectedEvent && eventDetails ? (
          <>
            {selectedVenue && selectedVenue.events.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  selectedEventRef.current = null;
                  setSelectedEvent(null);
                  popupRef.current?.setPositioning('center-center');
                  popupRef.current?.setOffset([0, 0]);
                }}
                style={{
                  marginBottom: '8px',
                  padding: 0,
                  border: 0,
                  background: 'none',
                  color: isDarkMode ? '#93c5fd' : '#1d4ed8',
                  cursor: 'pointer',
                  font: 'inherit',
                  textDecoration: 'underline',
                }}
              >
                Back to {selectedVenue.name} events
              </button>
            )}
            <div>
              <strong>{eventDetails.name}</strong>
            </div>
            <div>Venue: {eventDetails.venueName || 'Unavailable'}</div>
            <div>
              Artist:{' '}
              {eventDetails.artists.length > 0
                ? eventDetails.artists.map((artist, index) => (
                    <span key={`${artist}-${index}`}>
                      {index > 0 && ', '}
                      <button
                        type="button"
                        onClick={() => setSelectedArtist(artist)}
                        style={{
                          padding: 0,
                          border: 0,
                          background: 'none',
                          color: isDarkMode ? '#93c5fd' : '#1d4ed8',
                          cursor: 'pointer',
                          font: 'inherit',
                          textDecoration: 'underline',
                        }}
                      >
                        {artist}
                      </button>
                    </span>
                  ))
                : 'Unavailable'}
            </div>
            <div>Genre: {eventDetails.genre}</div>
            <div>Starts: {new Date(eventDetails.start).toLocaleString()}</div>
            <div>
              Ends:{' '}
              {eventDetails.end
                ? new Date(eventDetails.end).toLocaleString()
                : 'Unavailable'}
            </div>
            <div>Event ID: {eventDetails.ticksterId}</div>
            {eventDetails.ticketUrl && (
              <div>
                <a
                  href={eventDetails.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}
                >
                  Tickets
                </a>
              </div>
            )}
            {eventDetails.imageUrl && (
              <div>
                <a
                  href={eventDetails.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}
                >
                  Event image
                </a>
              </div>
            )}
          </>
        ) : selectedVenue ? (
          <>
            {(() => {
              const stageEvents = selectedStage
                ? selectedVenue.events.filter(
                    (event) =>
                      event.properties.venue_name.trim().toLocaleLowerCase() ===
                      selectedStage.toLocaleLowerCase()
                  )
                : selectedVenue.events;
              const pageCount = Math.ceil(
                stageEvents.length / EVENTS_PER_PAGE
              );
              const pageEvents = stageEvents.slice(
                venueEventsPage * EVENTS_PER_PAGE,
                (venueEventsPage + 1) * EVENTS_PER_PAGE
              );

              return (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: selectedVenue.stageNames.length > 1 ? '44px' : 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height:
                        selectedVenue.stageNames.length > 1
                          ? 'calc(100% - 44px)'
                          : '100%',
                    }}
                  >
                    {pageEvents.map((event, index) => {
                      const angle =
                        (index / pageEvents.length) * Math.PI * 2 -
                        Math.PI / 2;
                      const radius = 30;
                      const x = 50 + Math.cos(angle) * radius;
                      const y = 50 + Math.sin(angle) * radius;
                      const artists = event.properties.artists
                        .slice(0, 2)
                        .map((artist) => artist.name);

                      return (
                        <button
                          key={event.id}
                          type="button"
                          aria-label={`View ${event.properties.name}, ${new Date(
                            event.properties.start
                          ).toLocaleString()}`}
                          title={event.properties.name}
                          onClick={() => {
                            selectedEventRef.current = event;
                            setSelectedEvent(event);
                          }}
                          style={{
                            position: 'absolute',
                            top: `${y}%`,
                            left: `${x}%`,
                            display: 'grid',
                            width: '68px',
                            height: '68px',
                            placeItems: 'center',
                            transform: 'translate(-50%, -50%)',
                            padding: '6px',
                            border: '3px solid white',
                            borderRadius: '50%',
                            background: '#2563eb',
                            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.35)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: 600,
                            lineHeight: 1.15,
                            textAlign: 'center',
                          }}
                        >
                          {artists.length > 0
                            ? artists.join(' & ')
                            : 'Event'}
                        </button>
                      );
                    })}
                  </div>
                  {selectedVenue.stageNames.length > 1 && (
                    <label
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '50%',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: 'min(320px, calc(100% - 16px))',
                        transform: 'translateX(-50%)',
                        padding: '5px 8px',
                        borderRadius: '8px',
                        background: isDarkMode ? '#1f2937' : 'white',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <span>Stage</span>
                      <select
                        aria-label={`Choose stage at ${selectedVenue.name}`}
                        value={selectedStage ?? ''}
                        onChange={(change) => {
                          setSelectedStage(change.target.value || null);
                          setVenueEventsPage(0);
                        }}
                        style={{
                          minWidth: 0,
                          flex: 1,
                          background: isDarkMode ? '#111827' : 'white',
                          color: isDarkMode ? '#f9fafb' : '#171717',
                        }}
                      >
                        <option value="">All stages</option>
                        {selectedVenue.stageNames.map((stageName) => (
                          <option key={stageName} value={stageName}>
                            {stageName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    aria-label={selectedVenue.name}
                    title={selectedVenue.name}
                    onClick={() => {
                      popupRef.current?.setPosition(undefined);
                      selectedEventRef.current = null;
                      selectedVenueRef.current = null;
                      setSelectedEvent(null);
                      setSelectedVenue(null);
                      setSelectedStage(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      display: 'grid',
                      width: '76px',
                      height: '76px',
                      placeItems: 'center',
                      transform: 'translate(-50%, -50%)',
                      padding: '8px',
                      border: '4px solid white',
                      borderRadius: '50%',
                      background: '#1d4ed8',
                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.4)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      textAlign: 'center',
                    }}
                  >
                    {selectedVenue.name}
                  </button>
                  {pageCount > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: isDarkMode ? '#1f2937' : 'white',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Previous events"
                        disabled={venueEventsPage === 0}
                        onClick={() =>
                          setVenueEventsPage((page) => Math.max(0, page - 1))
                        }
                        style={{
                          border: 0,
                          borderRadius: '50%',
                          background: venueEventsPage === 0 ? '#e5e7eb' : '#2563eb',
                          color: venueEventsPage === 0 ? '#6b7280' : 'white',
                          cursor: venueEventsPage === 0 ? 'default' : 'pointer',
                          fontSize: '20px',
                          width: '32px',
                          height: '32px',
                        }}
                      >
                        ←
                      </button>
                      <span aria-live="polite" style={{ fontSize: '12px' }}>
                        {venueEventsPage + 1} / {pageCount}
                      </span>
                      <button
                        type="button"
                        aria-label="Next events"
                        disabled={venueEventsPage === pageCount - 1}
                        onClick={() =>
                          setVenueEventsPage((page) =>
                            Math.min(pageCount - 1, page + 1)
                          )
                        }
                        style={{
                          border: 0,
                          borderRadius: '50%',
                          background:
                            venueEventsPage === pageCount - 1
                              ? '#e5e7eb'
                              : '#2563eb',
                          color:
                            venueEventsPage === pageCount - 1
                              ? '#6b7280'
                              : 'white',
                          cursor:
                            venueEventsPage === pageCount - 1
                              ? 'default'
                              : 'pointer',
                          fontSize: '20px',
                          width: '32px',
                          height: '32px',
                        }}
                      >
                        →
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <span>Select a venue marker to view its events.</span>
        )}
          </div>,
          popupElement
        )}
      {selectedArtist && (
        <div
          onClick={() => setSelectedArtist(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.55)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="artist-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(100%, 1000px)',
              height: 'min(85vh, 760px)',
              overflow: 'auto',
              padding: '32px',
              borderRadius: '12px',
              background: isDarkMode ? '#1f2937' : 'white',
              color: isDarkMode ? '#f9fafb' : '#171717',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <button
              type="button"
              aria-label="Close artist details"
              onClick={() => setSelectedArtist(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 0,
                background: 'none',
                cursor: 'pointer',
                fontSize: '24px',
              }}
            >
              ×
            </button>
            <h2 id="artist-dialog-title">{selectedArtist}</h2>
            <p>Artist information will appear here.</p>
          </section>
        </div>
      )}
    </div>
  );
}
