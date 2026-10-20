'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import MapFilterBox from './MapFilterBox';
import { createPortal } from 'react-dom';
import 'ol/ol.css';

import type { Event, EventFeatureCollection } from '../lib/definition';
import { getSavedEvents, saveEvent } from './Lib/userAPI';
import { useSystemMessage } from './SystemMessageProvider';
import './Map.css';

import Feature from 'ol/Feature';
import OLMap from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import Cluster from 'ol/source/Cluster';
import StadiaMaps from 'ol/source/StadiaMaps';
import VectorSource from 'ol/source/Vector';

import { createEmpty, extend } from 'ol/extent';
import { fromLonLat } from 'ol/proj';

import Point from 'ol/geom/Point';

import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';

import { useSearchParams } from 'next/navigation';

type EventDetails = {
  id: number;
  name: string;
  start: string;
  end: string | null;
  ticketUrl: string;
  imageUrl: string;
  venueName: string;
  artists: string[];
  genres: string;
};

type VenueGroup = {
  key: string;
  name: string;
  coordinates: number[];
  stageNames: string[];
  events: Event[];
};

const EVENTS_PER_PAGE = 12;
const VENUE_MERGE_DISTANCE_METERS = 50;

function getMarkerColor(isDarkMode: boolean): string {
  return isDarkMode ? 'rgb(255, 132, 0)' : '#2563eb';
}

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
  } else if (typeof props.genres === 'string') {
    addGenreString(props.genres);
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
  const groups: VenueGroup[] = [];

  for (const event of events) {
    const name = event.properties.venue_name.trim();
    const coordinates = event.geometry.coordinates;
    const key = coordinates.join(',');
    const nameRoot = getVenueNameRoot(name);
    const group =
      groups.find((candidate) => candidate.key === key) ??
      groups.find(
        (candidate) =>
          nameRoot.length >= 4 &&
          getVenueNameRoot(candidate.stageNames[0]) === nameRoot &&
          getDistanceMeters(candidate.coordinates, coordinates) <=
            VENUE_MERGE_DISTANCE_METERS
      );

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
      groups.push({
        key,
        name,
        coordinates,
        stageNames: [name],
        events: [event],
      });
    }
  }

  return groups;
}

function getVenueNameRoot(name: string): string {
  return name
    .split(',')[0]
    .trim()
    .split(/[\s–—-]+/)[0]
    .toLocaleLowerCase();
}

function getDistanceMeters(first: number[], second: number[]): number {
  const [firstLongitude, firstLatitude] = first;
  const [secondLongitude, secondLatitude] = second;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(secondLatitude - firstLatitude);
  const longitudeDifference = radians(secondLongitude - firstLongitude);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(firstLatitude)) *
      Math.cos(radians(secondLatitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getSharedStageLabel(stageNames: string[], fallback: string): string {
  const stageWords = stageNames.map((stageName) =>
    stageName
      .split(',')[0]
      .trim()
      .split(/[\s–—-]+/)
      .filter(Boolean)
  );
  const firstStageWords = stageWords[0];
  if (!firstStageWords) return fallback;

  let sharedWordCount = 0;
  while (
    sharedWordCount < firstStageWords.length &&
    stageWords.every(
      (words) =>
        words[sharedWordCount]?.toLocaleLowerCase() ===
        firstStageWords[sharedWordCount].toLocaleLowerCase()
    )
  ) {
    sharedWordCount += 1;
  }

  return sharedWordCount > 0
    ? firstStageWords.slice(0, sharedWordCount).join(' ')
    : fallback;
}

interface ConcertMapProps {
  isDarkMode: boolean;
  onDarkModeChange: (isDarkMode: boolean) => void;
  isSidebarOpen: boolean;
  authenticatedUsername: string | null;
  onLoginRequired: () => void;
}
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
export default function ConcertMap({
  isDarkMode,
  onDarkModeChange,
  isSidebarOpen,
  authenticatedUsername,
  onLoginRequired,
}: ConcertMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const basemapLayerRef = useRef<TileLayer<StadiaMaps> | null>(null);
  const popupRef = useRef<Overlay | null>(null);
  const markerSourceRef = useRef<VectorSource<Feature<Point>> | null>(null);
  const markerFeaturesRef = useRef<Feature<Point>[]>([]);
  const hoveredFeatureRef = useRef<Feature | null>(null);
  const eventsRef = useRef<EventFeatureCollection | null>(null);
  const venuesRef = useRef<Map<string, VenueGroup>>(new Map());
  const selectedEventRef =
    useRef<EventFeatureCollection['features'][number] | null>(null);
  const selectedVenueRef = useRef<VenueGroup | null>(null);
  const [events, setEvents] = useState<EventFeatureCollection | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<EventFeatureCollection['features'][number] | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueGroup | null>(null);
  const [animateWheelEvents, setAnimateWheelEvents] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [venueEventsPage, setVenueEventsPage] = useState(0);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [popupElement, setPopupElement] = useState<HTMLDivElement | null>(null);
  const isDarkModeRef = useRef(isDarkMode);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => getTodayDate());
  const [endDate, setEndDate] = useState<string>('');
  const [savedEventIds, setSavedEventIds] = useState<Set<number>>(new Set());
  const [savedEventsUsername, setSavedEventsUsername] = useState<string | null>(null);
  const [savingEventId, setSavingEventId] = useState<number | null>(null);
  const showSystemMessage = useSystemMessage();

  //toggleable filter box
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const clearSelection = () => {
    popupRef.current?.setPosition(undefined);
    selectedEventRef.current = null;
    selectedVenueRef.current = null;
    setAnimateWheelEvents(false);
    setSelectedEvent(null);
    setSelectedVenue(null);
    setSelectedStage(null);
  };

  //searchbar connection
  const searchParams = useSearchParams();
  const searchTerm = (searchParams.get('search') || '').trim();

  const handleToggleGenre = (genre: string) => {
    clearSelection();
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const eventDetails: EventDetails | null = selectedEvent
    ? {
        id: selectedEvent.id,
        name: selectedEvent.properties.name,
        start: selectedEvent.properties.start,
        end: selectedEvent.properties.end,
        ticketUrl: selectedEvent.properties.ticket_url,
        imageUrl: selectedEvent.properties.image_url,
        venueName: selectedEvent.properties.venue_name,
        artists: selectedEvent.properties.artists.map((artist) => artist.name),
        genres: selectedEvent.properties.genres,
      }
    : null;

  useEffect(() => {
    if (!authenticatedUsername) return;

    let isCurrent = true;
    getSavedEvents()
      .then((savedEvents) => {
        if (isCurrent) {
          setSavedEventIds(new Set(savedEvents.map((event) => event.id)));
          setSavedEventsUsername(authenticatedUsername);
        }
      })
      .catch((caughtError: unknown) => {
        if (isCurrent) {
          showSystemMessage(
            caughtError instanceof Error
              ? caughtError.message
              : 'Could not load your saved events.',
            'error',
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [authenticatedUsername, showSystemMessage]);

  async function handleSaveEvent(eventId: number) {
    if (!authenticatedUsername) {
      showSystemMessage('Sign in to add events to your profile.', 'error');
      onLoginRequired();
      return;
    }

    setSavingEventId(eventId);
    try {
      await saveEvent(eventId);
      setSavedEventIds((current) => new Set(current).add(eventId));
      setSavedEventsUsername(authenticatedUsername);
      showSystemMessage('Event added to your events.', 'success');
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : 'Could not save this event.';
      showSystemMessage(message, 'error');
    } finally {
      setSavingEventId(null);
    }
  }

  const isSaved = (eventId: number) =>
    authenticatedUsername !== null &&
    savedEventsUsername === authenticatedUsername &&
    savedEventIds.has(eventId);

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
          showSystemMessage(
            caughtError instanceof Error
              ? caughtError.message
              : 'Could not load events from the API.',
            'error',
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
  }, [showSystemMessage]);

  useEffect(() => {
    if (!mapRef.current) return;

    const markerSource = new VectorSource<Feature<Point>>();
    markerSourceRef.current = markerSource;
    const clusterSource = new Cluster({
      distance: 40,
      source: markerSource,
      createCluster: (point, features) =>
        new Feature({
          geometry: point,
          features,
          eventCount: features.reduce(
            (total, feature) => total + Number(feature.get('eventCount') ?? 0),
            0
          ),
          clusterSize: features.length,
        }),
    });

    const eventsLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => {
        const clusterSize = Number(feature.get('clusterSize') ?? 1);
        const hoverScale = Number(feature.get('hoverScale') ?? 1);
        const markerStyle = new Style({
          image: new CircleStyle({
            radius: (clusterSize > 1 ? 14 : 11) * hoverScale,
            fill: new Fill({
              color: getMarkerColor(isDarkModeRef.current),
            }),
            stroke: new Stroke({ color: 'white', width: 2 }),
          }),
          text: new Text({
            text: String(feature.get('eventCount')),
            font: 'bold 11px Arial, sans-serif',
            fill: new Fill({ color: 'white' }),
            textAlign: 'center',
            textBaseline: 'middle',
          }),
        });

        if (clusterSize <= 1) return markerStyle;

        const haloRadius =
          Math.min(40, 24 + Math.sqrt(clusterSize - 1) * 5) * hoverScale;
        const haloColor = isDarkModeRef.current
          ? 'rgba(255, 132, 0, 0.2)'
          : 'rgba(37, 99, 235, 0.2)';

        return [
          new Style({
            image: new CircleStyle({
              radius: haloRadius,
              fill: new Fill({ color: haloColor }),
            }),
          }),
          markerStyle,
        ];
      },
    });

    const overlayElement = document.createElement('div');
    setPopupElement(overlayElement);

    const basemapLayer = new TileLayer({
      source: new StadiaMaps({ 
        layer: 'alidade_smooth',
        apiKey: process.env.NEXT_PUBLIC_STADIA_API_KEY,
       }),
      
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
    const scaleAnimations = new Map<
      Feature,
      { from: number; to: number; startedAt: number }
    >();
    let animationFrame: number | null = null;

    const animateScales = (timestamp: number) => {
      for (const [feature, animation] of scaleAnimations) {
        const progress = Math.min((timestamp - animation.startedAt) / 180, 1);
        const easedProgress = 1 - (1 - progress) ** 3;
        feature.set(
          'hoverScale',
          animation.from + (animation.to - animation.from) * easedProgress
        );
        if (progress === 1) scaleAnimations.delete(feature);
      }

      eventsLayer.changed();
      animationFrame = scaleAnimations.size > 0
        ? requestAnimationFrame(animateScales)
        : null;
    };

    const animateFeatureScale = (feature: Feature | null, scale: number) => {
      if (!feature) return;

      const currentScale = Number(feature.get('hoverScale') ?? 1);
      if (currentScale === scale) return;

      scaleAnimations.set(feature, {
        from: currentScale,
        to: scale,
        startedAt: performance.now(),
      });
      if (animationFrame === null) {
        animationFrame = requestAnimationFrame(animateScales);
      }
    };

    const handlePointerMove = (event: { pixel: number[] }) => {
      const hoveredFeature =
        map.forEachFeatureAtPixel(
          event.pixel,
          (feature) => (feature instanceof Feature ? feature : null),
          { layerFilter: (layer) => layer === eventsLayer }
        ) ?? null;

      if (hoveredFeatureRef.current !== hoveredFeature) {
        animateFeatureScale(hoveredFeatureRef.current, 1);
        hoveredFeatureRef.current = hoveredFeature;
        animateFeatureScale(hoveredFeatureRef.current, 1.5);
      }

      target.classList.toggle('map-pointer-cursor', Boolean(hoveredFeature));
    };
    map.on('pointermove', handlePointerMove);

    const handleMapClick = (click: { pixel: number[] }) => {
      const clickedMarker = map.forEachFeatureAtPixel(
        click.pixel,
        (feature) => feature,
        { layerFilter: (layer) => layer === eventsLayer }
      );
      const clusterMembers = clickedMarker?.get('features');
      const memberFeatures = Array.isArray(clusterMembers)
        ? clusterMembers.filter(
            (member): member is Feature<Point> => member instanceof Feature
          )
        : [];
      if (memberFeatures.length > 1) {
        const extent = createEmpty();
        for (const member of memberFeatures) {
          const geometry = member.getGeometry();
          if (geometry) extend(extent, geometry.getExtent());
        }
        popup.setPosition(undefined);
        selectedEventRef.current = null;
        selectedVenueRef.current = null;
        setSelectedEvent(null);
        setSelectedVenue(null);
        setSelectedStage(null);
        setVenueEventsPage(0);
        map.getView().fit(extent, {
          duration: 250,
          maxZoom: (map.getView().getZoom() ?? 11) + 3,
        });
        return;
      }
      const venueKey = (memberFeatures[0] ?? clickedMarker)?.get('venueKey');
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
      setAnimateWheelEvents(venue.events.length > 1);
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
      target.classList.remove('map-pointer-cursor');
      animateFeatureScale(hoveredFeatureRef.current, 1);
      hoveredFeatureRef.current = null;
    };
    target.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      map.un('pointermove', handlePointerMove);
      map.un('singleclick', handleMapClick);
      target.removeEventListener('pointerleave', handlePointerLeave);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      scaleAnimations.clear();
      mapInstanceRef.current = null;
      basemapLayerRef.current = null;
      popupRef.current = null;
      markerSourceRef.current = null;
      markerFeaturesRef.current = [];
      hoveredFeatureRef.current = null;
      clusterSource.setSource(null);
      setPopupElement(null);
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
    markerSourceRef.current?.changed();
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
      // Filter by search term
      if (searchTerm) {
        const query = searchTerm.toLocaleLowerCase();

        const matchesSearch =
          event.properties.name.toLocaleLowerCase().includes(query) ||
          event.properties.venue_name.toLocaleLowerCase().includes(query) ||
          event.properties.artists.some((artist) =>
            artist.name.toLocaleLowerCase().includes(query)
          ) ||
          getEventGenres(event).some((genre) =>
            genre.toLocaleLowerCase().includes(query)
          );

        if (!matchesSearch) return false;
      }
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
    
  }, [events, searchTerm, selectedGenres, startDate, endDate]);

  useEffect(() => {
    if (!events) return;

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
      data-sidebar-open={isSidebarOpen}
      className="concert-map"
    >
      <div ref={mapRef} className="concert-map__canvas" />
      <button
        type="button"
        aria-expanded={isFilterOpen}
        aria-controls="map-filter-box"
        onClick={() => setIsFilterOpen((open) => !open)}
        className="concert-map__filter-toggle"
      >
        {isFilterOpen ? 'Hide filters' : 'Show filters'}
      </button>
      {isFilterOpen && (
        <div id="map-filter-box"> 
          <MapFilterBox
            genres={availableGenres}
            selectedGenres={selectedGenres}
            onToggleGenre={handleToggleGenre}
            startDate={startDate}
            onStartDateChange={(date) => {
              clearSelection();
              setStartDate(date);
            }}
            endDate={endDate}
            onEndDateChange={(date) => {
              clearSelection();
              setEndDate(date);
            }}
            onReset={() => {
              clearSelection();
              setSelectedGenres([]);
              setStartDate('');
              setEndDate('');
            }}
            totalMatching={filteredFeatures.length}
            isDarkMode={isDarkMode}
          />
        </div>
          )}
      
      <button
        type="button"
        role="switch"
        aria-checked={isDarkMode}
        aria-label="Dark mode"
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => onDarkModeChange(!isDarkMode)}
        className={`theme-toggle concert-map__theme-toggle${isDarkMode ? ' theme-toggle--checked' : ''}`}
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
      {(loading || (events !== null && events.features.length === 0)) && (
        <div
          role="status"
          className="concert-map__status"
        >
          {loading ? 'Loading events…' : 'No events available from the API.'}
        </div>
      )}
      {popupElement &&
        createPortal(
          <div
            className={`map-popup${selectedVenue && !selectedEvent ? ' map-popup--venue' : ' map-popup--event'}`}
            data-theme={isDarkMode ? 'dark' : 'light'}
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
                className="map-popup__link map-popup__back"
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
                        className="map-popup__link"
                      >
                        {artist}
                      </button>
                    </span>
                  ))
                : 'Unavailable'}
            </div>
            <div>
              Genres:{' '}
              {eventDetails.genres
                ? eventDetails.genres
                : 'Unavailable'}
            </div>
            <div>Starts: {new Date(eventDetails.start).toLocaleString()}</div>
            <div>
              Ends:{' '}
              {eventDetails.end
                ? new Date(eventDetails.end).toLocaleString()
                : 'Unavailable'}
            </div>
            {eventDetails.ticketUrl && (
              <div>
                <a
                  href={eventDetails.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="map-popup__link"
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
                  className="map-popup__link"
                >
                  Event image
                </a>
              </div>
            )}
            <div className="map-popup__save">
              <button
                type="button"
                onClick={() => void handleSaveEvent(eventDetails.id)}
                disabled={
                  isSaved(eventDetails.id) ||
                  savingEventId === eventDetails.id
                }
                className="map-popup__save-button"
                data-saved={isSaved(eventDetails.id)}
                data-saving={savingEventId === eventDetails.id}
              >
                {isSaved(eventDetails.id)
                  ? 'Added to your events'
                  : savingEventId === eventDetails.id
                    ? 'Adding...'
                    : 'Add to your events'}
              </button>
            </div>
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
              const allStagesLabel = getSharedStageLabel(
                selectedVenue.stageNames,
                selectedVenue.name
              );
              const centerMarkerLabel = selectedStage ?? allStagesLabel;
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
                    className={`map-venue__events${selectedVenue.stageNames.length > 1 ? ' map-venue__events--multiple-stages' : ''}`}
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
                      const artistLabel =
                        artists.length > 0 ? artists.join(' & ') : 'Event';

                      return (
                        <motion.button
                          key={event.id}
                          type="button"
                          aria-label={`View ${event.properties.name}, ${new Date(
                            event.properties.start
                          ).toLocaleString()}`}
                          title={event.properties.name}
                          onClick={() => {
                            setAnimateWheelEvents(false);
                            selectedEventRef.current = event;
                            setSelectedEvent(event);
                          }}
                          initial={
                            animateWheelEvents
                              ? {
                                  left: '50%',
                                  top: '50%',
                                  opacity: 0,
                                  scale: 0.55,
                                }
                              : false
                          }
                          animate={{
                            left: `${x}%`,
                            top: `${y}%`,
                            opacity: 1,
                            scale: 1,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 22,
                            delay: index * 0.035,
                          }}
                          onAnimationComplete={() => {
                            if (index === pageEvents.length - 1) {
                              setAnimateWheelEvents(false);
                            }
                          }}
                          className={`map-venue__event${artistLabel.length > 24 ? ' map-venue__event--small' : artistLabel.length > 16 ? ' map-venue__event--medium' : ''}`}
                        >
                          <span
                            className="map-venue__label"
                          >
                            {artistLabel}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  {selectedVenue.stageNames.length > 1 && (
                    <label
                      className="map-venue__stage"
                    >
                      <span>Stage</span>
                      <select
                        aria-label={`Choose stage at ${selectedVenue.name}`}
                        value={selectedStage ?? ''}
                        onChange={(change) => {
                          setAnimateWheelEvents(false);
                          setSelectedStage(change.target.value || null);
                          setVenueEventsPage(0);
                        }}
                        className="map-venue__stage-select"
                      >
                        <option value="">{allStagesLabel}</option>
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
                    aria-label={centerMarkerLabel}
                    title={centerMarkerLabel}
                    onClick={() => {
                      popupRef.current?.setPosition(undefined);
                      selectedEventRef.current = null;
                      selectedVenueRef.current = null;
                      setAnimateWheelEvents(false);
                      setSelectedEvent(null);
                      setSelectedVenue(null);
                      setSelectedStage(null);
                    }}
                    className={`map-venue__center${centerMarkerLabel.length > 26 ? ' map-venue__center--small' : centerMarkerLabel.length > 18 ? ' map-venue__center--medium' : ''}`}
                  >
                    <span
                      className="map-venue__label"
                    >
                      {centerMarkerLabel}
                    </span>
                  </button>
                  {pageCount > 1 && (
                    <div
                      className="map-venue__pagination"
                    >
                      <button
                        type="button"
                        aria-label="Previous events"
                        disabled={venueEventsPage === 0}
                        onClick={() => {
                          setAnimateWheelEvents(false);
                          setVenueEventsPage((page) => Math.max(0, page - 1))
                        }}
                        className="map-venue__page-button"
                      >
                        ←
                      </button>
                      <span aria-live="polite" className="map-venue__page-count">
                        {venueEventsPage + 1} / {pageCount}
                      </span>
                      <button
                        type="button"
                        aria-label="Next events"
                        disabled={venueEventsPage === pageCount - 1}
                        onClick={() => {
                          setAnimateWheelEvents(false);
                          setVenueEventsPage((page) =>
                            Math.min(pageCount - 1, page + 1)
                          )
                        }}
                        className="map-venue__page-button"
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
          className="map-artist-overlay"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="artist-dialog-title"
            onClick={(event) => event.stopPropagation()}
            className="map-artist-dialog"
            data-theme={isDarkMode ? 'dark' : 'light'}
          >
            <button
              type="button"
              aria-label="Close artist details"
              onClick={() => setSelectedArtist(null)}
              className="map-artist-dialog__close"
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
