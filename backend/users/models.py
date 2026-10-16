from django.db import models
from django.contrib.auth.models import User
from events.models import Event

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    display_name = models.CharField(max_length=100, blank=True)
    profile_picture = models.URLField(max_length=500, blank=True)
    profile_picture_image = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True,
    )
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(max_length=200, blank=True)

    saved_events = models.ManyToManyField(Event, blank=True, related_name='saved_by_users')
    favorite_genres = models.ManyToManyField(
        'events.Genre',
        blank=True,
        related_name='favorite_by_users',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"
