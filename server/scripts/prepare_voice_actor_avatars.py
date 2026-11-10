"""Find profile avatars for unclaimed voice actor personas without guessing identities."""

from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.request import urlopen

from scripts.prepare_resource_enrichments import useful_image
from scripts.research_resource_profiles import fetch_metadata


DATA = Path(__file__).parent / "data"
HANDLE = re.compile(r"(?:推特\s*[（(]?X?[）)]?\s*|Twitter\s*)@([A-Za-z0-9_]+)", re.I)


def main():
    personas = json.load(urlopen("http://127.0.0.1:8891/api/public-bundle?sections=personas", timeout=15))["personas"]
    works = json.loads((DATA / "audio_work_credits_2026-11-10.json").read_text())["works"]
    links = json.loads((DATA / "resource_links_2026-11-10.json").read_text())["links"]
    metadata = {item["url"]: item for item in json.loads((DATA / "resource_profiles_research_2026-11-10.json").read_text())["profiles"]}
    by_name = defaultdict(list)
    for link in links:
        if link["role"] == "voice_actor":
            by_name[link["creditedAs"]].append({"url": link["url"], "sourceUrl": link["sourceUrl"]})
    for work in works:
        for credit in work["catalogCredits"] + work["credits"]:
            if credit["role"] != "voice_actor":
                continue
            match = HANDLE.search(credit["creditedAs"])
            if match:
                name = credit["creditedAs"].split("推特", 1)[0].split("Twitter", 1)[0].strip(" （(")
                by_name[name].append({"url": f"https://x.com/{match.group(1)}", "sourceUrl": work["sourceUrl"]})
    now = int(datetime.now(timezone.utc).timestamp() * 1000)
    chosen = []
    for persona in personas:
        if persona.get("avatar") or persona.get("voiceActorHidden") or "voice_actor" not in (persona.get("roles") or []):
            continue
        name = persona["displayName"]
        short_name = name.split("/")[0]
        candidates = list(by_name[short_name])
        candidates.extend({"url": link.get("url", ""), "sourceUrl": link.get("url", "")}
                          for link in persona.get("links") or [] if (link.get("url") or "").startswith("https://"))
        best = None
        for candidate in candidates:
            url = candidate["url"]
            if url not in metadata:
                metadata[url] = fetch_metadata(url)
            profile = metadata[url]
            image = useful_image(profile.get("imageUrl", ""))
            title = profile.get("title", "")
            if profile["status"] != "ok" or not image:
                continue
            # The linked page must identify the performer; generic social
            # previews and links for another staff member are not enough.
            if short_name.casefold() not in title.casefold():
                continue
            score = len(title) + (10 if candidate["sourceUrl"] != url else 0)
            if best is None or score > best[0]:
                best = (score, candidate, image)
        if best:
            _, source, image = best
            chosen.append({"personaId": persona["id"], "name": name, "avatarUrl": image,
                           "profileUrl": source["url"], "sourceUrl": source["sourceUrl"], "checkedAt": now})
    chosen.sort(key=lambda item: item["name"])
    output = DATA / "voice_actor_avatars_2026-11-10.json"
    output.write_text(json.dumps({"avatars": chosen}, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {len(chosen)} verified voice actor avatars: {', '.join(item['name'] for item in chosen)}")


if __name__ == "__main__":
    main()
