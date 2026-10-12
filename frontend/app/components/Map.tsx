'use client';

import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';

<<<<<<< Updated upstream
import type { EventFeatureCollection } from '../lib/definition';
=======
import { placeholderEvents, type Event as ConcertEvent } from '../lib/definition';
>>>>>>> Stashed changes

import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
<<<<<<< Updated upstream
import GeoJSON from 'ol/format/GeoJSON';
=======
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
  const mapInstanceRef = useRef<Map | null>(null);
  const [events, setEvents] = useState<EventFeatureCollection | null>(null);
  const eventsRef = useRef<EventFeatureCollection | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<EventFeatureCollection['features'][number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
=======
  const markerSourceRef = useRef<VectorSource | null>(null);
  const markerFeaturesRef = useRef<Feature[]>([]);
  const selectedEventRef = useRef<ConcertEvent | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ConcertEvent | null>(null);
  const genres = Array.from(
    new Set(placeholderEvents.features.map((event) => event.properties.genre))
  ).sort();
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(
    () => new Set(genres)
  );
  const firstEvent = placeholderEvents.features[0];
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
        genre: selectedEvent.properties.genre,
>>>>>>> Stashed changes
      }
    : null;

  useEffect(() => {
    const controller = new AbortController();

<<<<<<< Updated upstream
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events/', {
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
    if (!mapRef.current || !popupRef.current) return;

    const vectorSource = new VectorSource({
      url: '/api/events/',
      format: new GeoJSON(),
    });
    const eventsLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#2563eb' }),
          stroke: new Stroke({ color: 'white', width: 2 }),
        }),
      }),
=======
    const markers = placeholderEvents.features.map((event) => {
      const marker = new Feature({
        geometry: new Point(fromLonLat(event.geometry.coordinates)),
        eventId: event.id,
        genre: event.properties.genre,
      });

      marker.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 15,
            fill: new Fill({
              color: 'red',
            }),
            stroke: new Stroke({
              color: 'white',
              width: 4,
            }),
          }),
        })
      );

      return marker;
    });

    markerFeaturesRef.current = markers;
    const markerSource = new VectorSource({
      features: markers,
    });
    markerSourceRef.current = markerSource;

    // Marker layer
    const markerLayer = new VectorLayer({
      source: markerSource,
      zIndex: 1000,
>>>>>>> Stashed changes
    });

    const popup = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      offset: [0, -18],
      stopEvent: true,
    });
    // Map
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
<<<<<<< Updated upstream
        eventsLayer,
=======

        markerLayer,
>>>>>>> Stashed changes
      ],
      overlays: [popup],
      view: new View({
<<<<<<< Updated upstream
        center: fromLonLat([18.0686, 59.3293]),
=======
        center: fromLonLat(firstEvent.geometry.coordinates),
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    const handleMapClick = (click: { pixel: number[] }) => {
      const clickedMarker = map.forEachFeatureAtPixel(
        click.pixel,
        (feature) => feature,
        { layerFilter: (layer) => layer === eventsLayer }
      );
      const geometry = clickedMarker?.getGeometry();
      if (!(geometry instanceof Point) || !clickedMarker) {
        popup.setPosition(undefined);
=======
    const handleMapClick = (event: { pixel: number[] }) => {
      const clickedMarker = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature,
        { layerFilter: (layer) => layer === markerLayer }
      );

      if (!clickedMarker) {
        popup.setPosition(undefined);
        selectedEventRef.current = null;
>>>>>>> Stashed changes
        setSelectedEvent(null);
        return;
      }

<<<<<<< Updated upstream
      const ticksterId = clickedMarker.get('tickster_id');
      const event = eventsRef.current?.features.find(
        (candidate) => candidate.properties.tickster_id === ticksterId
=======
      const clickedEventId = clickedMarker.get('eventId');
      const clickedEvent = placeholderEvents.features.find(
        (event) => event.id === clickedEventId
      );
      if (!clickedEvent) return;

      if (selectedEventRef.current?.id === clickedEvent.id) {
        popup.setPosition(undefined);
        selectedEventRef.current = null;
        setSelectedEvent(null);
        return;
      }

      selectedEventRef.current = clickedEvent;
      setSelectedEvent(clickedEvent);
      popup.setPosition(
        fromLonLat(clickedEvent.geometry.coordinates)
>>>>>>> Stashed changes
      );
      if (!event) {
        popup.setPosition(undefined);
        setSelectedEvent(null);
        return;
      }

      setSelectedEvent(event);
      popup.setPosition(geometry.getCoordinates());
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
<<<<<<< Updated upstream
      mapInstanceRef.current = null;
=======
      markerSourceRef.current = null;
      markerFeaturesRef.current = [];
>>>>>>> Stashed changes
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const firstEvent = events?.features[0];
    if (!map || !firstEvent) return;

    map.getView().setCenter(fromLonLat(firstEvent.geometry.coordinates));
  }, [events]);

  useEffect(() => {
    const markerSource = markerSourceRef.current;
    if (!markerSource) return;

    markerSource.clear(true);
    markerSource.addFeatures(
      markerFeaturesRef.current.filter((marker) =>
        selectedGenres.has(marker.get('genre'))
      )
    );
  }, [selectedGenres]);

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
<<<<<<< Updated upstream
      {(loading || error || (events && events.features.length === 0)) && (
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
          {error ?? (loading ? 'Loading events…' : 'No events available from the API.')}
        </div>
      )}
=======
      <fieldset
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          display: 'grid',
          gap: '8px',
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
>>>>>>> Stashed changes
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
            <div><strong>{eventDetails.name}</strong></div>
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
            <div>
              Starts: {new Date(eventDetails.start).toLocaleString()}
            </div>
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