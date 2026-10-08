'use client';

import { useEffect, useRef } from 'react';
import 'ol/ol.css';

import { placeholderEvents } from '../lib/definition';

import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';

import GeoJSON from 'ol/format/GeoJSON';

import { fromLonLat } from 'ol/proj';

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';

type EventDetails = {
  ticksterId: string;
  name: string;
  start: string;
  end: string;
  ticketUrl: string;
  imageUrl: string;
  venueName: string;
  artists: string[];
};

export default function ConcertMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const firstEvent = placeholderEvents.features[0];
  const eventDetails: EventDetails | null = firstEvent
    ? {
        ticksterId: firstEvent.properties.tickster_id,
        name: firstEvent.properties.name,
        start: firstEvent.properties.start,
        end: firstEvent.properties.end,
        ticketUrl: firstEvent.properties.ticket_url,
        imageUrl: firstEvent.properties.image_url,
        venueName: firstEvent.properties.venue_name,
        artists: firstEvent.properties.artists.map((artist) => artist.name),
      }
    : null;

  useEffect(() => {
    if (!mapRef.current || !popupRef.current || !firstEvent) return;

    const geoJsonFormat = new GeoJSON();
    const concertSource = new VectorSource({
      features: geoJsonFormat.readFeatures(placeholderEvents, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      }),
    });

    const concertLayer = new VectorLayer({
      source: concertSource,
    });

    const firstEventLocation = fromLonLat(firstEvent.geometry.coordinates);

    // Create marker
    const marker = new Feature({
      geometry: new Point(firstEventLocation),
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

    // Marker source
    const markerSource = new VectorSource({
      features: [marker],
    });

    // Marker layer
    const markerLayer = new VectorLayer({
      source: markerSource,
      zIndex: 1000,
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

        concertLayer,

        markerLayer,
      ],
      overlays: [popup],

      view: new View({
        center: firstEventLocation,
        zoom: 11,
      }),
    });

    const target = mapRef.current;
    const handlePointerMove = (event: { pixel: number[] }) => {
      const isMarkerHovered = map.hasFeatureAtPixel(event.pixel, {
        layerFilter: (layer) => layer === markerLayer,
      });

      target.style.cursor = isMarkerHovered ? 'pointer' : '';
    };
    map.on('pointermove', handlePointerMove);

    const handleMapClick = (event: { pixel: number[] }) => {
      const isMarkerClicked = map.hasFeatureAtPixel(event.pixel, {
        layerFilter: (layer) => layer === markerLayer,
      });

      if (!isMarkerClicked) {
        popup.setPosition(undefined);
        return;
      }

      popup.setPosition(
        popup.getPosition() ? undefined : firstEventLocation
      );
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
      map.setTarget(undefined);
    };
  }, [firstEvent]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
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
              Ends: {new Date(eventDetails.end).toLocaleString()}
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
          <span>No local event details available.</span>
        )}
      </div>
    </div>
  );
}