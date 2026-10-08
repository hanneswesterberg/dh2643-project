import placeholderEventData from './placeholder_event.json';


export type Artist = {
  id: number;
  name: string;
};

export type EventProperties = {
  tickster_id: string;
  name: string;
  start: string;
  end: string;
  ticket_url: string;
  image_url: string;
  venue_name: string;
  artists: Artist[];
};

export type EventGeometry = {
  type: string;
  coordinates: number[];
};

export type Event = {
  id: number;
  type: string;
  geometry: EventGeometry;
  properties: EventProperties;
};

export type EventFeatureCollection = {
  type: string;
  features: Event[];
};

export const placeholderEvents: EventFeatureCollection = placeholderEventData;