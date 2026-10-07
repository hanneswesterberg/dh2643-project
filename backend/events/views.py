from rest_framework import viewsets
from .models import Event
from .serializers import EventSerializer

class EventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EventSerializer
    pagination_class = None

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

    