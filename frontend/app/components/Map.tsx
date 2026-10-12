'use client';

import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';

import type { EventFeatureCollection } from '../lib/definition';
import { mockEvents } from '../lib/mockEvents';

import Feature from 'ol/Feature';
import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';

import { fromLonLat } from 'ol/proj';

import Point from 'ol/geom/Point';

import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';

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

export default function ConcertMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerSourceRef = useRef<VectorSource<Feature<Point>> | null>(null);
  const markerFeaturesRef = useRef<Feature<Point>[]>([]);
  const eventsRef = useRef<EventFeatureCollection | null>(null);
  const selectedEventRef =
    useRef<EventFeatureCollection['features'][number] | null>(null);
  const [events, setEvents] = useState<EventFeatureCollection | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<EventFeatureCollection['features'][number] | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingMockEvents, setShowingMockEvents] = useState(false);

  const genres = Array.from(
    new Set(events?.features.map((event) => event.properties.genre) ?? [])
  ).sort();

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
        const response = await fetch('/api/events/', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Events API request failed (${response.status})`);
        }

        const data: EventFeatureCollection = await response.json();
        const includeMockEvents = process.env.NODE_ENV === 'development';
        const displayEvents = includeMockEvents
          ? { ...data, features: [...data.features, ...mockEvents.features] }
          : data;
        eventsRef.current = displayEvents;
        setEvents(displayEvents);
        setSelectedGenres(
          new Set(displayEvents.features.map((event) => event.properties.genre))
        );
        setShowingMockEvents(includeMockEvents);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : 'Could not load events from the API.';
          if (process.env.NODE_ENV === 'development') {
            eventsRef.current = mockEvents;
            setEvents(mockEvents);
            setSelectedGenres(
              new Set(
                mockEvents.features.map((event) => event.properties.genre)
              )
            );
            setShowingMockEvents(true);
            setError(
              `${message}. Showing sample events for frontend development.`
            );
          } else {
            setError(message);
          }
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
    if (!mapRef.current || !popupRef.current) return;

    const markerSource = new VectorSource<Feature<Point>>();
    markerSourceRef.current = markerSource;

    const eventsLayer = new VectorLayer({
      source: markerSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#2563eb' }),
          stroke: new Stroke({ color: 'white', width: 2 }),
        }),
      }),
    });

    const popup = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      offset: [0, -18],
      stopEvent: true,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
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
      const eventId = clickedMarker?.get('eventId');
      const event = eventsRef.current?.features.find(
        (candidate) => candidate.id === eventId
      );

      if (!event) {
        popup.setPosition(undefined);
        selectedEventRef.current = null;
        setSelectedEvent(null);
        return;
      }

      if (selectedEventRef.current?.id === event.id) {
        popup.setPosition(undefined);
        selectedEventRef.current = null;
        setSelectedEvent(null);
        return;
      }

      selectedEventRef.current = event;
      setSelectedEvent(event);
      popup.setPosition(fromLonLat(event.geometry.coordinates));
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
      markerSourceRef.current = null;
      markerFeaturesRef.current = [];
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    if (!events) return;

    const markerFeatures = events.features.map(
      (event) =>
        new Feature({
          geometry: new Point(fromLonLat(event.geometry.coordinates)),
          eventId: event.id,
          genre: event.properties.genre,
        })
    );
    markerFeaturesRef.current = markerFeatures;

    const markerSource = markerSourceRef.current;
    if (!markerSource) return;

    markerSource.clear(true);
    markerSource.addFeatures(
      markerFeatures.filter((marker) =>
        selectedGenres.has(marker.get('genre'))
      )
    );

  }, [events, selectedGenres]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) => {
      const next = new Set(current);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      return next;
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {(loading ||
        error ||
        showingMockEvents ||
        (events && events.features.length === 0)) && (
        <div
          role={error ? 'alert' : 'status'}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            color: error ? '#b91c1c' : '#171717',
          }}
        >
          {error ??
            (showingMockEvents
              ? 'Development mode: sample events are mixed with API events.'
              : loading
                ? 'Loading events…'
                : 'No events available from the API.')}
        </div>
      )}
      {genres.length > 0 && (
        <fieldset
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1000,
            display: 'grid',
            gap: '8px',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            margin: 0,
            padding: '12px 16px',
            border: '1px solid #d4d4d4',
            borderRadius: '8px',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            color: '#171717',
          }}
        >
          <legend style={{ padding: '0 4px', fontWeight: 600 }}>Genres</legend>
          {genres.map((genre) => (
            <label
              key={genre}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedGenres.has(genre)}
                onChange={() => toggleGenre(genre)}
              />
              {genre}
            </label>
          ))}
        </fieldset>
      )}
      <div
        ref={popupRef}
        style={{
          minWidth: '220px',
          maxWidth: '280px',
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'white',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
          color: '#171717',
          fontSize: '14px',
          pointerEvents: 'auto',
        }}
      >
        {eventDetails ? (
          <>
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
                          color: '#1d4ed8',
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
                >
                  Event image
                </a>
              </div>
            )}
          </>
        ) : (
          <span>Select an event marker to view its details.</span>
        )}
      </div>
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
              background: 'white',
              color: '#171717',
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
