from django.contrib import admin
from .models import Event, Venue, Artist

admin.site.register(Event)
admin.site.register(Venue)
admin.site.register(Artist)
