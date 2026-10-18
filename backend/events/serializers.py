from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer, GeometryField
from .models import Event, Artist

class ArtistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = ['id', 'name']

class EventSerializer(GeoFeatureModelSerializer):
    artists = ArtistSerializer(many=True, read_only=True)
    genres = serializers.SerializerMethodField()
    
    # Read-only field to extract the venue name directly into the event object
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    
    # Explicitly map the related venue's location to a local serializer field
    location = GeometryField(source='venue.location', read_only=True)

    def get_genres(self, event):
        return sorted(
            {
                genre.name
                for artist in event.artists.all()
                for genre in artist.genres.all()
            },
            key=str.casefold,
        )

    class Meta:
        model = Event
        # Point to the locally defined geometry field above, not the nested path
        geo_field = "location"
        fields = [
            'id', 'tickster_id', 'name', 'start', 'end', 
            'ticket_url', 'image_url', 'venue_name', 'artists', 'genres'
        ]