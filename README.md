
# DH2643 Group 9 Project – ConcertMap Stockholm

This application displays concerts and events on a map. Event data is fetched from Tickster and artists enriched with genre tags from MusicBrainz.

## Requirements
- Docker and Docker Compose installed on your machine.

## How to run the project locally

1. **Clone the repo and enter the directory**
```bash
git clone https://github.com/hanneswesterberg/dh2643-project
cd dh2643-project
```

2. **Build and start the containers**
Build the images and start the frontend, backend, and database in the background:
```bash
docker compose up -d --build
```

3. **Run database migrations**
Once the database has started (might take a while), run the migrations to create the tables:
```bash
docker compose exec backend python manage.py migrate
```

4. **Load test data from Tickster & MusicBrainz**
To populate the database with events and genres, open the Django shell:
```bash
docker compose exec backend python manage.py shell
```

Then paste the following:
```python
import json
from events.sync import sync_tickster_data
with open("tickster_dump.json", "r", encoding="utf-8") as f:
    sync_tickster_data(json.load(f))
```


*To fetch MusicBrainz genres (API has rate limit of 1 request/sec):*
```bash
docker compose exec backend python manage.py sync_musicbrainz --limit 50
```


5. **Open the application**
* Frontend (Next.js): http://localhost:3000
* Backend API: http://localhost:8000/api/events/

