import time
import requests
from django.core.management.base import BaseCommand
from django.utils import timezone
from events.models import Artist, Genre

class Command(BaseCommand):
    help = "Fetches genres and MBID from MusicBrainz for unsynced artists."

    def add_arguments(self, parser):
        # Allows us to limit how many we fetch per run (good for testing)
        parser.add_argument('--limit', type=int, default=50, help='Max number of artists to sync')

    def handle(self, *args, **options):
        limit = options['limit']
        
        # Fetch artists that haven't been synced yet
        artists_to_sync = Artist.objects.filter(mb_last_synced_at__isnull=True)[:limit]
        
        if not artists_to_sync:
            self.stdout.write(self.style.SUCCESS("All artists are already synced!"))
            return

        self.stdout.write(f"Starting to sync {len(artists_to_sync)} artists with MusicBrainz...")

        # MusicBrainz requires a User-Agent to avoid blocking requests
        headers = {
            "User-Agent": "ConcertAppKTH/1.0.0 ( student@kth.se )",
            "Accept": "application/json"
        }

        for artist in artists_to_sync:
            self.stdout.write(f"Searching for: {artist.name}... ", ending="")
            
            # Format the name for the search query
            query = f'artist:"{artist.name}"'
            url = f"https://musicbrainz.org/ws/2/artist/?query={query}&fmt=json"

            try:
                response = requests.get(url, headers=headers, timeout=10)
                
                # Update the timestamp regardless of whether we find a match,
                # so we don't get stuck in a loop trying to fetch the same unknown artist
                artist.mb_last_synced_at = timezone.now()

                if response.status_code == 200:
                    data = response.json()
                    mb_artists = data.get("artists", [])
                    
                    if mb_artists:
                        # Take the best matching result
                        best_match = mb_artists[0]
                        artist.musicbrainz_id = best_match.get("id")
                        
                        # Extract tags/genres
                        tags = best_match.get("tags", [])
                        genres_to_add = []
                        
                        for tag in tags:
                            tag_name = tag.get("name", "").strip().lower()
                            if tag_name:
                                # Create the genre if it doesn't exist
                                genre_obj, _ = Genre.objects.get_or_create(name=tag_name)
                                genres_to_add.append(genre_obj)
                        
                        # Save the artist before adding Many-To-Many relationships
                        artist.save()
                        
                        if genres_to_add:
                            artist.genres.set(genres_to_add)
                            
                        self.stdout.write(self.style.SUCCESS(f"Found {len(genres_to_add)} genres!"))
                    else:
                        artist.save()
                        self.stdout.write(self.style.WARNING("No match."))
                else:
                    artist.save()
                    self.stdout.write(self.style.ERROR(f"API Error: {response.status_code}"))

            except requests.RequestException as e:
                self.stdout.write(self.style.ERROR(f"Network Error: {e}"))
            
            # MusicBrainz has a rate limit (1 request/sec)
            # Sleep for 1.2 seconds to be on the safe side
            time.sleep(1.2)

