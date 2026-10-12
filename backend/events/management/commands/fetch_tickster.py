"""
This will be used to update the database daily after deployment.
"""

from django.core.management.base import BaseCommand
from events.services.tickster import fetch_raw_event_dump
from events.sync import sync_tickster_data

class Command(BaseCommand):
    help = 'Fetches latest Tickster event dump and updates the database'

    def handle(self, *args, **options):

        self.stdout.write("Fetching latest Tickster data")

        try:
            raw_data = fetch_raw_event_dump()
            sync_tickster_data(raw_data)
            self.stdout.write(self.style.SUCCESS('Successfully synced Tickster data'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to fetch or sync data. Error: {str(e)}'))

