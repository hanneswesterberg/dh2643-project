from django.contrib.gis.db import models


class Venue(models.Model):
    tickster_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    # Point(x, y) representerar (longitude, latitude) i WGS84 (SRID 4326)
    location = models.PointField(srid=4326, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.city})" if self.city else self.name


class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Artist(models.Model):
    name = models.CharField(max_length=255, unique=True)
    musicbrainz_id = models.CharField(max_length=64, null=True, blank=True)
    genres = models.ManyToManyField(Genre, related_name="artists", blank=True)
    mb_last_synced_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name


class Event(models.Model):
    tickster_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start = models.DateTimeField()
    end = models.DateTimeField(null=True, blank=True)
    ticket_url = models.URLField(max_length=500, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="events",
        null=True,
        blank=True,
    )
    artists = models.ManyToManyField(Artist, related_name="events", blank=True)

    def __str__(self):
        return self.name

    