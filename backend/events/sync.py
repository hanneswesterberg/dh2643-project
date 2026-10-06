"""
This file handles the upsert logic. 
Reads the Tickster JSON dump and fills the database.
"""

import logging
from django.contrib.gis.geos import Point
from events.models import Venue, Artist, Event

logger = logging.getLogger(__name__)

def sync_tickster_data(data: dict):

    venues_data = data.get("venues", [])
    events_data = data.get("events", [])

    # Sync venues, store them in a dictionary
    venue_map = {}
    for v_data in venues_data:
        tickster_id = v_data.get("id")
        if not tickster_id:
            continue

        # Extract coordinates
        geo = v_data.get("geo")
        location = None
        if geo and geo.get("longitude") and geo.get("latitude"):
            # GeoDjango Point always takes (longitude, latitude)
            location = Point(geo["longitude"], geo["latitude"], srid=4326)

        venue, created = Venue.objects.update_or_create(
            tickster_id=tickster_id,
            defaults={
                "name": (v_data.get("name") or "")[:255],
                "address": (v_data.get("address") or "")[:255],
                "city": (v_data.get("city") or "")[:100],
                "location": location
            }
        )
        venue_map[tickster_id] = venue

    # Sync events and artists
    for e_data in events_data:
        tickster_id = e_data.get("id")
        if not tickster_id:
            continue

        # Link to correct venue
        v_id = e_data.get("venueId")
        venue = venue_map.get(v_id)

        # Upsert event (Django autoconverts ISO-8601 strings to DateTime)
        event, created = Event.objects.update_or_create(
            tickster_id=tickster_id,
            defaults={
                "name": (e_data.get("name") or "")[:255],
                "description": e_data.get("description") or "",
                "start": e_data.get("start"),
                "end": e_data.get("end"),
                "ticket_url": (e_data.get("shopUri") or "")[:500],
                "image_url": (e_data.get("imageUrl") or "")[:500],
                "venue": venue,
            }
        )

        # Extract artists
        artists_to_link = []
        spotify_artists = e_data.get("spotifyArtists", [])
        performers = e_data.get("performers", [])

        if spotify_artists:
            # Spotify names are best, use if available
            for sa in spotify_artists:
                artist_name = sa.get("name")
                if artist_name:
                    artist, _ = Artist.objects.update_or_create(name=artist_name[:255])
                    artists_to_link.append(artist)
        else:
            # Fallback: Clear performers from obvious non-performer values
            for perf in performers:
                # Ignore rows containing colon or very long strings
                if ":" in perf or len(perf) > 60:
                    continue
                
                perf_name = perf.strip()
                if perf_name:
                    artist, _ = Artist.objects.update_or_create(name=perf_name[:255])
                    artists_to_link.append(artist)

        # Link artists to event (replaces existing links)
        if artists_to_link:
            event.artists.set(artists_to_link)
