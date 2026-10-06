from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


class Venue(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True)
    zip_code = models.CharField(max_length=32, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=2, blank=True)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    info_uri = models.URLField(max_length=500, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(latitude__gte=-90) & Q(latitude__lte=90),
                name="venue_latitude_in_range",
            ),
            models.CheckConstraint(
                condition=Q(longitude__gte=-180) & Q(longitude__lte=180),
                name="venue_longitude_in_range",
            ),
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name


class LiveShow(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    published = models.BooleanField()
    start = models.DateTimeField(db_index=True)
    end = models.DateTimeField(null=True, blank=True)
    last_updated = models.DateTimeField(null=True, blank=True)
    doors_open = models.DateTimeField(null=True, blank=True)
    hierarchy_type = models.CharField(max_length=50, blank=True)
    production_parent_id = models.CharField(max_length=64, null=True, blank=True)
    info_uri = models.URLField(max_length=500, blank=True)
    shop_uri = models.URLField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    is_collection_event = models.BooleanField(default=False)
    venue = models.ForeignKey(
        Venue,
        on_delete=models.SET_NULL,
        related_name="live_shows",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["start", "name"]
        indexes = [
            models.Index(
                fields=["published", "start"],
                name="liveshow_published_start_idx",
            ),
        ]

    def __str__(self):
        return self.name
