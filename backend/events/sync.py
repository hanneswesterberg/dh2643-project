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

        valid_artist_names = []
        spotify_artists = e_data.get("spotifyArtists", [])
        performers = e_data.get("performers", [])

        if spotify_artists:
            for sa in spotify_artists:
                artist_name = sa.get("name")
                if artist_name:
                    valid_artist_names.append(artist_name[:255])

        else:
            for perf in performers:
                if ":" in perf or len(perf) > 60:
                    continue

                perf_name = perf.strip()
                if perf_name:
                    valid_artist_names.append(perf_name[:255])

        # Exclude event entirely if no valid artists were found
        if not valid_artist_names:
            continue

        # Link to correct venue
        v_id = e_data.get("venueId")
        venue = venue_map.get(v_id)

        # Upsert event
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

        # Create/get Artist objects and link them
        artists_to_link = []
        for name in valid_artist_names:
            artist, _ = Artist.objects.get_or_create(name=name)
            artists_to_link.append(artist)

        event.artists.set(artists_to_link)

