"""Fill unclaimed voice actor avatars and profile links from verified sources in Dev."""

import json
import os
from pathlib import Path

from database import SessionLocal
from models import Persona
from scripts.import_resource_enrichments import valid_https
from scripts.prepare_resource_enrichments import profile_label


SNAPSHOT = Path(__file__).parent / "data" / "voice_actor_profiles_2026-11-10.json"


def main():
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to import outside the dev database")
    profiles = json.loads(SNAPSHOT.read_text())["profiles"]
    imported = []
    with SessionLocal() as db:
        for item in profiles:
            urls = [item.get("avatarUrl"), item.get("profileUrl"), item.get("sourceUrl")]
            urls.extend(link.get("url") for link in item.get("extraLinks", []))
            if not all(valid_https(url) for url in urls if url):
                raise ValueError(f"Invalid profile source for {item['name']}")
            persona = db.get(Persona, item["personaId"])
            if persona is None or persona.ownerId or persona.voiceActorHidden:
                continue
            if persona.displayName != item["name"]:
                raise ValueError(f"Persona name changed for {item['personaId']}")
            changed = False
            if not persona.avatar and item.get("avatarUrl"):
                persona.avatar = item["avatarUrl"]
                changed = True
            if not persona.bio and item.get("bio"):
                persona.bio = item["bio"]
                changed = True
            if not item.get("avatarUrl") or persona.avatar == item["avatarUrl"]:
                links = [link for link in (persona.links or []) if isinstance(link, dict)] if isinstance(persona.links, list) else []
                additions = list(item.get("extraLinks", []))
                if item.get("profileUrl"):
                    additions.insert(0, {"label": profile_label(item["profileUrl"]), "url": item["profileUrl"]})
                for link in additions:
                    if any(existing.get("url") == link["url"] for existing in links):
                        continue
                    links.append(link)
                    changed = True
                if changed:
                    persona.links = links
            if changed:
                imported.append(persona.displayName)
        db.commit()
    print(f"Updated {len(imported)} voice actor profiles: {', '.join(imported)}")


if __name__ == "__main__":
    main()
