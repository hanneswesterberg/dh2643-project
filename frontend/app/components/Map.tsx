'use client';

import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';

import type { EventFeatureCollection } from '../lib/definition';

import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

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
};

export default function ConcertMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [events, setEvents] = useState<EventFeatureCollection | null>(null);
  const eventsRef = useRef<EventFeatureCollection | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<EventFeatureCollection['features'][number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const geometry = clickedMarker?.getGeometry();
      if (!(geometry instanceof Point) || !clickedMarker) {
        popup.setPosition(undefined);
        setSelectedEvent(null);
        return;
      }

      const ticksterId = clickedMarker.get('tickster_id');
      const event = eventsRef.current?.features.find(
        (candidate) => candidate.properties.tickster_id === ticksterId
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
      mapInstanceRef.current = null;
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const firstEvent = events?.features[0];
    if (!map || !firstEvent) return;

    map.getView().setCenter(fromLonLat(firstEvent.geometry.coordinates));
  }, [events]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
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
                ? eventDetails.artists.join(', ')
                : 'Unavailable'}
            </div>
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
    </div>
  );
}