'use client'; // Forces Next.js to render this strictly in the browser
 
import { useEffect, useRef } from 'react';
import 'ol/ol.css'; // Required for the map to display correctly
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { useGeographic } from 'ol/proj';

// OpenLayers uses Web Mercator by default. This tells it to use 
// standard longitude/latitude coordinates globally (which GeoJSON uses).
useGeographic();

export default function ConcertMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Fetch our GeoJSON data via the proxy we set up
    const vectorSource = new VectorSource({
      url: '/api/events/',
      format: new GeoJSON(),
    });

    // 2. Initialize the OpenLayers Map
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),     // Standard base map layer
        new VectorLayer({ source: vectorSource }) // Our concerts data layer
      ],
      view: new View({
        center: [18.0686, 59.3293], // Center map on Stockholm [longitude, latitude]
        zoom: 11,
      }),
    });

    // Cleanup function to remove the map when the component unmounts
    return () => map.setTarget(undefined);
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />;
}

