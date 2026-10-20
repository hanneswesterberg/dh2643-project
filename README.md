
# DH2643 Group 9 Project – Ballad

This application displays concerts and events on a map. Event data is fetched from Tickster and artists enriched with genre tags from MusicBrainz.

## How to run the project locally

- Make sure Docker and Docker Compose are installed on your machine.

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
Once the database has started, run the migrations to create the tables:
```bash
docker compose exec backend python manage.py migrate
```

4. **Load test data from Tickster & MusicBrainz**
To populate the database with events and genres, open the Django shell:
```bash
docker compose exec backend python manage.py fetch_tickster
```

*To fetch MusicBrainz genres (API has rate limit of 1 request/sec):*
Set --limit to whatever you like. The higher the better, but it will take longer.
```bash
docker compose exec backend python manage.py sync_musicbrainz --limit 50
```

5. **Open the application**
* Frontend (Next.js): http://localhost:3000
* Backend API: http://localhost:8000/api/

