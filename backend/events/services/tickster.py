import requests
from django.conf import settings


def fetch_raw_event_dump(language_code="sv", api_version="1.0"):
    """
    Fetches the raw event dump from Tickster.
    1. Requests the manifest to get the signed AWS S3 dump URI.
    2. Downloads and parses the JSON dump payload from S3.
    """
    api_key = settings.TICKSTER_API_KEY
    if not api_key:
        raise ValueError("TICKSTER_API_KEY is not set.")

    # Fetch manifest
    manifest_url = (
        f"https://api.tickster.com/{language_code}/api/{api_version}/events/dump/upcoming?key={api_key}"
    )
    manifest_res = requests.get(manifest_url, timeout=30)
    manifest_res.raise_for_status()
    manifest_data = manifest_res.json()

    # Behövs detta?
    dump_uri = manifest_data.get("uri")
    if not dump_uri:
        raise ValueError("Tickster manifest response missing 'uri' field.")

    # Fetch dump from S3
    dump_res = requests.get(dump_uri, timeout=60)
    dump_res.raise_for_status()

    return dump_res.json()

