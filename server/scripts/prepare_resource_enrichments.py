"""Select sourced profile details for Dev resource cards from research snapshots."""

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import urlparse
from urllib.request import urlopen

from scripts.research_resource_profiles import fetch_metadata


DATA = Path(__file__).parent / "data"
EXTRA_PROFILES = {
    ("cover_art", "白夜BYA"): "https://byakuya0315.wixsite.com/bya0315",
    ("cover_art", "蝶朱"): "https://portaly.cc/shaiichu",
}
EXTRA_BIOS = {
    ("cover_art", "白夜BYA"): "擅長日式風格人物、女性向與 BL 插畫，作品包含小說封面與角色設計。",
}
GENERIC_DESCRIPTION = ("Clibo 是台灣第一個委託約稿平台", "在這個收納電玩", "Join Facebook", "X is the global town square")


def profile_label(url):
    host = (urlparse(url).hostname or "").lower()
    if host in {"x.com", "twitter.com"}:
        return "X"
    if "youtube.com" in host:
        return "YouTube"
    if "plurk.com" in host:
        return "Plurk"
    if "pixiv.net" in host:
        return "Pixiv"
    if "portaly.cc" in host:
        return "Portaly"
    if "facebook.com" in host:
        return "Facebook"
    if "gamer.com.tw" in host:
        return "巴哈姆特"
    if "clibo.tw" in host:
        return "Clibo"
    return "個人網站"


def useful_image(url):
    if not url.startswith("https://") or "default-og" in url:
        return ""
    host = (urlparse(url).hostname or "").lower()
    if host in {"pbs.twimg.com", "avatars.plurk.com", "yt3.googleusercontent.com", "img.portaly.cc"}:
        return url
    if host == "i.pximg.net" and "/user-profile/" in url:
        return url
    if host == "assets.clibo.tw" and "/users/avatars/" in url:
        return url
    if host == "linktr.ee" and "/og/image/" in url:
        return url
    return ""


def useful_bio(value):
    value = re.sub(r"https?://\S+", "", value or "")
    value = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "", value)
    value = re.sub(r"[（(]現在20\d\d[^）)]*[）)]", "", value)
    value = re.sub(r"[（(]委託\s*OFF[）)]", "", value, flags=re.I)
    value = re.split(r"\s+(?:Linktree|PIXIV|FANBOX|Patreon|EMAIL|お仕事の依頼は|業務聯絡請洽|聯絡信箱)\s*[:：]", value, maxsplit=1, flags=re.I)[0]
    value = re.sub(r"\s+", " ", value).strip(" ·|,;，；")
    if not value or any(value.startswith(prefix) for prefix in GENERIC_DESCRIPTION):
        return ""
    return value[:135].rstrip(" ·|,;，；")


def quality(profile):
    if not profile or profile["status"] != "ok":
        return 0
    title = profile.get("title") or ""
    generic_title = title in {"X", "Facebook", "YouTube", ""}
    return 2 + (0 if generic_title else 1) + (3 if useful_bio(profile.get("description")) else 0) + (2 if useful_image(profile.get("imageUrl", "")) else 0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-url", default="http://127.0.0.1:8891/api/public-bundle?sections=productionResources")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    resources = json.load(urlopen(args.bundle_url, timeout=15))["productionResources"]
    links = json.loads((DATA / "resource_links_2026-11-10.json").read_text())["links"]
    metadata = {item["url"]: item for item in json.loads((DATA / "resource_profiles_research_2026-11-10.json").read_text())["profiles"]}
    by_role_name = defaultdict(list)
    by_name = defaultdict(list)
    for link in links:
        by_role_name[(link["role"], link["creditedAs"])].append(link)
        by_name[link["creditedAs"].casefold()].append(link)
    now = int(datetime.now(timezone.utc).timestamp() * 1000)
    selected = []
    for resource in resources:
        role = resource["categories"][0]
        name = resource["name"]
        curated = resource.get("kind") != "credit"
        candidates = []
        if curated:
            candidates = [{"url": resource["websiteUrl"], "sourceUrl": resource["sourceUrl"]}]
        else:
            candidates = by_role_name[(role, name)] or by_name[name.casefold()]
            extra = EXTRA_PROFILES.get((role, name))
            if extra:
                candidates = [{"url": extra, "sourceUrl": extra}] + candidates
        if not candidates:
            continue
        counts = Counter(item["url"] for item in candidates)
        ranked = []
        for candidate in candidates:
            url = candidate["url"]
            if url not in metadata:
                metadata[url] = fetch_metadata(url)
            info = metadata[url]
            score = quality(info) * 10 + min(counts[url], 5)
            if EXTRA_PROFILES.get((role, name)) == url:
                score += 100
            ranked.append((score, candidate))
        _, chosen = max(ranked, key=lambda entry: entry[0])
        profile = metadata[chosen["url"]]
        selected.append({
            "id": resource["id"], "name": name, "category": role,
            "profileUrl": chosen["url"], "profileLabel": profile_label(chosen["url"]),
            "avatarUrl": useful_image(profile.get("imageUrl", "")),
            "bio": EXTRA_BIOS.get((role, name), resource.get("summary", "") if curated else useful_bio(profile.get("description"))),
            "sourceUrl": chosen["sourceUrl"], "checkedAt": now,
        })
    selected.sort(key=lambda item: (item["category"], item["name"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"enrichments": selected}, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {len(selected)} resource profiles; {sum(bool(item['avatarUrl']) for item in selected)} avatars, {sum(bool(item['bio']) for item in selected)} bios")


if __name__ == "__main__":
    main()
