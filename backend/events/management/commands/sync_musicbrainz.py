import time
import requests
from django.core.management.base import BaseCommand
from django.utils import timezone
from events.models import Artist, Genre

class Command(BaseCommand):
    help = "Fetches genres and MBID from MusicBrainz for unsynced artists."

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=50, help='Max number of artists to sync')
        parser.add_argument('--retries', type=int, default=3, help='Max retries for 503 errors')

    def handle(self, *args, **options):
        limit = options['limit']
        max_retries = options['retries']
        
        # Fetch artists that haven't been synced yet
        artists_to_sync = Artist.objects.filter(mb_last_synced_at__isnull=True)[:limit]
        
        if not artists_to_sync:
            self.stdout.write(self.style.SUCCESS("All artists are already synced!"))
            return

        self.stdout.write(f"Starting to sync {len(artists_to_sync)} artists with MusicBrainz...")

        headers = {
            "User-Agent": "ConcertAppKTH/1.0.0 ( hanneswe@kth.se )",
            "Accept": "application/json"
        }

        for artist in artists_to_sync:
            self.stdout.write(f"Searching for: {artist.name}... ", ending="")
            query = f'artist:"{artist.name}"'
            url = f"https://musicbrainz.org/ws/2/artist/?query={query}&fmt=json"

            # The inner retry loop
            for attempt in range(max_retries + 1):
                try:
                    response = requests.get(url, headers=headers, timeout=10)
                    
                    # Handle the 503 error gracefully
                    if response.status_code == 503:
                        if attempt < max_retries:
                            # Exponential backoff: 3s, 6s, 9s
                            sleep_time = (attempt + 1) * 3 
                            self.stdout.write(self.style.WARNING(f"\n[503 Overload] Retrying in {sleep_time}s... "), ending="")
                            time.sleep(sleep_time)
                            continue  # Loop again for the next attempt
                        else:
                            # Max retries hit. Break out, DO NOT save timestamp.
                            self.stdout.write(self.style.ERROR("Failed after max retries. Skipping."))
                            break

                    # If not 503 (200 OK, 404, etc.), safe to update the sync timestamp
                    artist.mb_last_synced_at = timezone.now()

                    if response.status_code == 200:
                        data = response.json()
                        mb_artists = data.get("artists", [])
                        
                        if mb_artists:
                            best_match = mb_artists[0]
                            artist.musicbrainz_id = best_match.get("id")
                            
                            tags = best_match.get("tags", [])
                            genres_to_add = []
                            
                            for tag in tags:
                                tag_name = tag.get("name", "").strip().lower()
                                if tag_name:
                                    genre_obj, _ = Genre.objects.get_or_create(name=tag_name)
                                    genres_to_add.append(genre_obj)
                            
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

                    break 

                except requests.RequestException as e:
                    self.stdout.write(self.style.ERROR(f"Network Error: {e}"))
                    break
            
            # Standard MusicBrainz rate limit sleep between different artists
            time.sleep(1.05)

