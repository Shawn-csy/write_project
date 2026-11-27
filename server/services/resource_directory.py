"""Compact identity inputs for the public resource directory.

Work references retain the identity fields used by the shared catalog merger.
Artwork and work descriptions are fetched only when a work lane opens.
"""


def _work_reference(work):
    ref = {key: work[key] for key in ("id", "creditRole", "audioWorkId", "url", "characterName")
           if work.get(key)}
    if not ref.get("url"):
        ref["title"] = work.get("title", "")
    return ref


def resource_directory_rows(personas, resources):
    people = {p["id"]: p for p in personas}
    production = {r.get("personaId") or r["id"]: r for r in resources}
    rows = []
    for ident in dict.fromkeys([*people, *production]):
        person = people.get(ident, {})
        resource = production.get(ident, {})
        credits = person.get("workParticipations")
        if credits is None:
            credits = resource.get("works", [])
        roles = list(dict.fromkeys([
            *person.get("roles", []), *resource.get("categories", []),
            *resource.get("commissionCategories", []), *resource.get("otherRoles", []),
            *(work["creditRole"] for work in credits),
            *(work["creditRole"] for work in resource.get("works", [])),
        ]))
        rows.append({
            "id": ident,
            "displayName": person.get("displayName") or resource.get("name") or "未命名",
            "avatar": person.get("avatar") or resource.get("avatarUrl"),
            "bio": person.get("bio") or resource.get("bio") or resource.get("summary") or "",
            "website": person.get("website") or resource.get("websiteUrl"),
            "links": person.get("links") if person.get("links") is not None else resource.get("links", []),
            "tags": person.get("tags") or [],
            "roles": roles,
            "voiceActorHidden": bool(person.get("voiceActorHidden")),
            "commissionCategories": resource.get("commissionCategories", []),
            "recordingEntityType": (person.get("roleProfiles") or {}).get("recording_studio", {}).get("entityType") or resource.get("recordingEntityType"),
            "workReferences": [_work_reference(work) for work in credits],
        })
    return rows
