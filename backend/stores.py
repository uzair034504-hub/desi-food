"""
Store locator — finds nearby grocery/kiryana stores using Google Places API
when the user is missing an ingredient. Needs GOOGLE_PLACES_API_KEY.

Get a key: https://console.cloud.google.com/google/maps-apis/credentials
Enable: "Places API (New)" for your project.
"""

import os
import requests

GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby"


def find_nearby_stores(lat: float, lng: float, ingredient: str = "", radius_m: int = 3000) -> list[dict]:
    if not GOOGLE_PLACES_API_KEY:
        return []

    body = {
        "includedTypes": ["grocery_store", "supermarket", "convenience_store"],
        "maxResultCount": 8,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius_m,
            }
        },
    }

    response = requests.post(
        NEARBY_SEARCH_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": (
                "places.displayName,places.formattedAddress,places.rating,"
                "places.location,places.currentOpeningHours.openNow"
            ),
        },
        json=body,
        timeout=15,
    )

    if not response.ok:
        print("Google Places API error:", response.status_code, response.text)
        return []

    data = response.json()
    stores = []
    for place in data.get("places", []):
        stores.append(
            {
                "name": place.get("displayName", {}).get("text", "Unknown store"),
                "address": place.get("formattedAddress", ""),
                "rating": place.get("rating"),
                "open_now": place.get("currentOpeningHours", {}).get("openNow"),
                "lat": place.get("location", {}).get("latitude"),
                "lng": place.get("location", {}).get("longitude"),
            }
        )
    return stores


def format_stores_reply(stores: list[dict], ingredient: str) -> str:
    if not stores:
        return (
            f"Mujhe aapke aas paas '{ingredient}' ke liye stores nahi mil sake. "
            "Location permission on hai aur Google Places key set hai, check kar lein."
        )

    lines = [f"**{ingredient} ke liye nearby stores:**\n"]
    for s in stores:
        status = "🟢 Open" if s["open_now"] else ("🔴 Closed" if s["open_now"] is False else "")
        rating = f"⭐ {s['rating']}" if s.get("rating") else ""
        lines.append(f"- **{s['name']}** — {s['address']} {rating} {status}".strip())

    return "\n".join(lines)
