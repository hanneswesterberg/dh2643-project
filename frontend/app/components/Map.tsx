'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'ol/ol.css';

import type { Event, EventFeatureCollection } from '../lib/definition';

import Feature from 'ol/Feature';
import OLMap from 'ol/Map';
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

type VenueGroup = {
  key: string;
  name: string;
  coordinates: number[];
  events: Event[];
};

function groupEventsByVenue(events: Event[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();

  for (const event of events) {
    const name = event.properties.venue_name.trim();
    const coordinates = event.geometry.coordinates;
    const key = `${name.toLocaleLowerCase()}|${coordinates.join(',')}`;
    const group = groups.get(key);
    if (group) {
      group.events.push(event);
    } else {
      groups.set(key, {
        key,
        name,
        coordinates,
        events: [event],
      });
    }
  }

  return Array.from(groups.values());
}

export default function ConcertMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
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
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupElement, setPopupElement] = useState<HTMLDivElement | null>(null);

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
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#2563eb' }),
          stroke: new Stroke({ color: 'white', width: 2 }),
        }),
      }),
    });

    const overlayElement = document.createElement('div');
    setPopupElement(overlayElement);

    const popup = new Overlay({
      element: overlayElement,
      positioning: 'bottom-center',
      offset: [0, -18],
      stopEvent: true,
    });

    const map = new OLMap({
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
        return;
      }

      if (selectedVenueRef.current?.key === venue.key) {
        popup.setPosition(undefined);
        selectedEventRef.current = null;
        selectedVenueRef.current = null;
        setSelectedEvent(null);
        setSelectedVenue(null);
        return;
      }

      selectedVenueRef.current = venue;
      setSelectedVenue(venue);
      if (venue.events.length === 1) {
        const [event] = venue.events;
        selectedEventRef.current = event;
        setSelectedEvent(event);
      } else {
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
      markerSourceRef.current = null;
      markerFeaturesRef.current = [];
      setPopupElement(null);
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    if (!events) return;

    const venues = groupEventsByVenue(events.features);
    venuesRef.current = new Map(venues.map((venue) => [venue.key, venue]));
    const markerFeatures = venues.map(
      (venue) =>
        new Feature({
          geometry: new Point(fromLonLat(venue.coordinates)),
          venueKey: venue.key,
        })
    );
    markerFeaturesRef.current = markerFeatures;

    const markerSource = markerSourceRef.current;
    if (!markerSource) return;

    markerSource.clear(true);
    markerSource.addFeatures(markerFeatures);
  }, [events]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
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
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            color: error ? '#b91c1c' : '#171717',
          }}
        >
          {error ??
            (loading ? 'Loading events…' : 'No events available from the API.')}
        </div>
      )}
      {popupElement &&
        createPortal(
          <div
        style={{
          minWidth: '220px',
          maxWidth: '280px',
          maxHeight: 'min(70vh, 480px)',
          overflowY: 'auto',
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'white',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
          color: '#171717',
          fontSize: '14px',
          pointerEvents: 'auto',
        }}
      >
        {selectedEvent && eventDetails ? (
          <>
            {selectedVenue && selectedVenue.events.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  selectedEventRef.current = null;
                  setSelectedEvent(null);
                }}
                style={{
                  marginBottom: '8px',
                  padding: 0,
                  border: 0,
                  background: 'none',
                  color: '#1d4ed8',
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
        ) : selectedVenue ? (
          <>
            <strong>{selectedVenue.name}</strong>
            <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
              {selectedVenue.events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    selectedEventRef.current = event;
                    setSelectedEvent(event);
                  }}
                  style={{
                    padding: '8px',
                    border: '1px solid #d4d4d4',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#171717',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                  }}
                >
                  <strong>{event.properties.name}</strong>
                  <div>{new Date(event.properties.start).toLocaleString()}</div>
                </button>
              ))}
            </div>
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
