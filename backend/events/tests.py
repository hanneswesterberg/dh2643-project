from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.gis.geos import Point
from .models import Artist, Event, Genre, Venue

# Create your tests here.
class EventAPITests(APITestCase):
    def setUp(self):
        # Mock venue with coordinates in the middle of sthlm
        self.venue = Venue.objects.create(
            tickster_id="v-test-1",
            name="Test Venue",
            location=Point(18.0686, 59.3293, srid=4326)
        )

        # Mock event linked to the venue
        self.event = Event.objects.create(
            tickster_id="e-test-1",
            name="Test Concert",
            venue=self.venue,
            start="2026-12-01T19:00:00Z",
            end="2026-12-01T23:00:00Z"
        )

    def test_get_events_list(self):
        # Events endpoint should return 200 OK and valid GeoJSON
        url = '/api/events/'
        response = self.client.get(url)
        
        # Verify HTTP status
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify GeoJSON structure
        self.assertEqual(response.data['type'], 'FeatureCollection')
        self.assertTrue(len(response.data['features']) > 0)
        
        # Verify that our specific mock event is in the returned properties
        first_feature = response.data['features'][0]
        self.assertEqual(first_feature['properties']['name'], 'Test Concert')
        self.assertEqual(first_feature['properties']['venue_name'], 'Test Venue')
        self.assertEqual(first_feature['properties']['genres'], [])

    def test_get_events_includes_artist_genres(self):
        punk = Genre.objects.create(name='Punk')
        alternative_rock = Genre.objects.create(name='Alternative rock')
        first_artist = Artist.objects.create(name='First Artist')
        second_artist = Artist.objects.create(name='Second Artist')
        first_artist.genres.add(punk, alternative_rock)
        second_artist.genres.add(punk)
        self.event.artists.add(first_artist, second_artist)

        response = self.client.get('/api/events/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = next(
            feature
            for feature in response.data['features']
            if feature['properties']['name'] == 'Test Concert'
        )
        self.assertEqual(
            event['properties']['genres'],
            ['Alternative rock', 'Punk'],
        )
