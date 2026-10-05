from django.db import models


class Concert(models.Model):
    title = models.CharField(max_length=200)
    artist = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()

    def __str__(self):
        return self.title

