from django.shortcuts import render
from django.http import JsonResponse
from .models import Concert

def hardcoded_map_data(request):
    # Create a dummy event if the database is completely empty
    if not Concert.objects.exists():
        Concert.objects.create(
            title="Daft Punk Reunion",
            artist="Daft Punk",
            latitude=59.3293,  # Stockholm
            longitude=18.0686
        )
    
    concert = Concert.objects.first()
    
    # Standard GeoJSON specification
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [concert.longitude, concert.latitude] # GeoJSON uses [lon, lat]
                },
                "properties": {
                    "title": concert.title,
                    "artist": concert.artist
                }
            }
        ]
    }
    return JsonResponse(geojson)

