from rest_framework import viewsets, filters, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Artist, Genre, Venue, Event
from .serializers import EventSerializer

class EventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EventSerializer
    pagination_class = None

    # Enable Django REST built-in search filter
    filter_backends = [filters.SearchFilter]
    
    # Define which fields ?search= will check
    search_fields = [
        'name',                   # Match the event name
        'artists__name',          # Match any artist playing
        'venue__name',            # Match the venue
        'artists__genres__name'   # Match specific genres
    ]

    def get_queryset(self):
        # Only include events with valid coordinates
        # distinct() avoids duplicate events when filtering M2M
        queryset = Event.objects.filter(
            venue__location__isnull=False
        ).select_related('venue').prefetch_related(
            'artists', 'artists__genres'
        ).distinct()

        # Get 'genre' query param from the request URL
        genre_param = self.request.query_params.get('genre', None)

        if genre_param:
            # Filter events where at least one associated artist has a matching genre
            queryset = queryset.filter(
                artists__genres__name__icontains=genre_param
                )
        return queryset

class GlobalSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        
        # If the search is empty, return empty lists
        if not query:
            return Response({"artists": [], "genres": [], "venues": []})

        # Fetch top 5 matches for each category to keep the curtain clean
        artists = Artist.objects.filter(name__icontains=query).values('id', 'name')[:5]
        genres = Genre.objects.filter(name__icontains=query).values('id', 'name')[:5]
        venues = Venue.objects.filter(name__icontains=query).values('id', 'name')[:5]

        return Response({
            "artists": list(artists),
            "genres": list(genres),
            "venues": list(venues)
        }, status=200)
    