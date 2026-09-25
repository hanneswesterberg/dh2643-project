from django.db import models


# Sketch for the liveshow, ticket, and artist
# Should be replaced with API and database fetching

class Liveshow(models.Model):
    title = models.CharField(max_length=100)
    artist = models.CharField(max_length=100)
    description = models.TextField()
    date = models.DateTimeField()
    location = models.CharField(max_length=100)   # TODO coordination implementation

    def __str__(self):
        return self.title


class Ticket(models.Model):
    liveshow = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return self.liveshow + " - " + str(self.price)


class Artist(models.Model):
    name = models.CharField(max_length=100)
    bio = models.TextField()
    genres = models.CharField(max_length=100)

    def __str__(self):
        return self.name
