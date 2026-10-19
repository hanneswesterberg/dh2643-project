export type Artist = {
  id: number;
  name: string;
};

export type EventProperties = {
  tickster_id: string;
  name: string;
  start: string;
  end: string | null;
  ticket_url: string;
  image_url: string;
  venue_name: string;
  artists: Artist[];
  genres: string;
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
