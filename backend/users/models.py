from django.db import models
from django.contrib.auth.models import User
from events.models import Event

class UserProfile(models.Model):
    # Links one-to-one relation to the built-in User model
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Many-to-Many relation to let users save multiple events and for events to be saved by multiple users
    saved_events = models.ManyToManyField(Event, blank=True, related_name='saved_by_users')

    def __str__(self):
        return f"Profile for {self.user.username}"
