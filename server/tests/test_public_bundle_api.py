from types import SimpleNamespace
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Event
import time

import routers.public_bundle as public_bundle_router
import models
from scripts.import_production_resources import credited_roles
from scripts.import_audio_work_credits import credits_for, display_name


def test_audio_work_credits_use_official_role_and_catalog_fallback():
    record = {"status": "ok", "credits": [{"role": "cover_art", "sourceRole": "封面", "creditedAs": "封面：布里"}],
              "catalogCredits": [{"role": "cover_art", "sourceRole": "封面", "creditedAs": "舊名"},
                                 {"role": "recording", "sourceRole": "錄音", "creditedAs": "工作室"}]}
    assert list(credits_for(record)) == [
        ("cover_art", "封面", "布里", "official_page"),
        ("recording", "錄音", "工作室", "catalog_description"),
    ]
    assert display_name("葉月 ( https://twitter.com/example )") == "葉月"
    combined = {"status": "ok", "credits": [], "catalogCredits": [
        {"role": "post_production", "sourceRole": "後製", "creditedAs": "一介（第 1–4 軌）、硯（第 5 軌）"},
    ]}
    assert list(credits_for(combined)) == [
        ("post_production", "後製（第 1–4 軌）", "一介", "catalog_description"),
        ("post_production", "後製（第 5 軌）", "硯", "catalog_description"),
    ]


def test_public_audio_works_include_only_approved_credits(client, db_session):
    public_bundle_router.invalidate_public_bundle_cache()
    db_session.add_all([
        models.PublicAudioWorkSubmission(id="credit-approved", title="作品甲", url="https://example.com/a", status="approved"),
        models.PublicAudioWorkSubmission(id="credit-pending", title="作品乙", url="https://example.com/b", status="pending"),
    ])
    db_session.flush()
    db_session.add_all([
        models.AudioWorkCredit(audioWorkId="credit-approved", role="cover_art", sourceRole="封面", creditedAs="甲", provenance="official_page", sourceUrl="https://example.com/a", checkedAt=1),
        models.AudioWorkCredit(audioWorkId="credit-pending", role="cover_art", sourceRole="封面", creditedAs="乙", provenance="official_page", sourceUrl="https://example.com/b", checkedAt=1),
    ])
    db_session.commit()
    response = client.get("/api/public-bundle?sections=audioWorks")
    assert response.status_code == 200
    assert len(response.json()["audioWorks"]) == 1
    assert response.json()["audioWorks"][0]["credits"] == [{
        "role": "cover_art", "sourceRole": "封面", "creditedAs": "甲",
        "provenance": "official_page", "sourceUrl": "https://example.com/a",
    }]
    public_bundle_router.invalidate_public_bundle_cache()


def test_unlisted_staff_appear_as_work_credits_in_resources(client, db_session):
    public_bundle_router.invalidate_public_bundle_cache()
    db_session.add_all([
        models.PublicAudioWorkSubmission(id="staff-work", title="作品甲", url="https://example.com/a", status="approved"),
        models.PublicAudioWorkSubmission(id="staff-pending", title="作品乙", url="https://example.com/b", status="pending"),
    ])
    db_session.flush()
    db_session.add_all([
        models.AudioWorkCredit(audioWorkId="staff-work", role="cover_art", sourceRole="封面", creditedAs="新畫師", provenance="official_page", sourceUrl="https://example.com/a", checkedAt=1),
        models.AudioWorkCredit(audioWorkId="staff-pending", role="cover_art", sourceRole="封面", creditedAs="新畫師", provenance="official_page", sourceUrl="https://example.com/b", checkedAt=1),
    ])
    db_session.commit()
    response = client.get("/api/public-bundle?sections=productionResources")
    assert response.status_code == 200
    listings = response.json()["productionResources"]
    assert len(listings) == 1
    assert listings[0]["name"] == "新畫師"
    assert listings[0]["kind"] == "credit"
    assert [(work["id"], work["creditRole"]) for work in listings[0]["works"]] == [("staff-work", "cover_art")]
    db_session.add(models.ProductionResourceEnrichment(
        id=listings[0]["id"], profileUrl="https://example.com/artist", profileLabel="個人網站",
        avatarUrl="https://example.com/avatar.jpg", bio="插畫創作者",
        sourceUrl="https://example.com/a", checkedAt=1,
    ))
    db_session.add(models.ProductionResourceLink(
        id="artist-social", resourceId=listings[0]["id"], label="X",
        url="https://x.com/artist", sourceUrl="https://example.com/a", checkedAt=1,
    ))
    db_session.commit()
    public_bundle_router.invalidate_public_bundle_cache()
    enriched = client.get("/api/public-bundle?sections=productionResources").json()["productionResources"][0]
    assert enriched["profileUrl"] == "https://example.com/artist"
    assert enriched["avatarUrl"] == "https://example.com/avatar.jpg"
    assert enriched["bio"] == "插畫創作者"
    assert enriched["links"] == [{"label": "X", "url": "https://x.com/artist"}]
    public_bundle_router.invalidate_public_bundle_cache()


def test_explicit_production_credit_parser_handles_combined_roles():
    assert set(credited_roles("錄音・後期：所有聲音製作\n封面：玫臼惹\n故事裡提到後製：不是署名")) == {
        ("recording_studio", "所有聲音製作"),
        ("post_production", "所有聲音製作"),
        ("cover_art", "玫臼惹"),
    }


def test_production_resources_only_exposes_published_sourced_listings(client, db_session):
    public_bundle_router.invalidate_public_bundle_cache()
    db_session.add_all([
        models.ProductionResource(
            id="listed", name="公開工作室", categories=["recording_studio"],
            summary="錄音服務", websiteUrl="https://example.com/",
            sourceUrl="https://example.com/services", status="published", reviewedAt=1,
        ),
        models.ProductionResource(
            id="draft", name="待查工作室", categories=["recording_studio"],
            summary="待查", websiteUrl="https://example.org/",
            sourceUrl="https://example.org/", status="draft", reviewedAt=1,
        ),
    ])
    db_session.add_all([
        models.PublicAudioWorkSubmission(id="approved-work", title="作品甲", url="https://example.com/work", coverUrl="https://example.com/cover.jpg", status="approved"),
        models.PublicAudioWorkSubmission(id="pending-work", title="作品乙", url="https://example.com/private", status="pending"),
    ])
    db_session.flush()
    db_session.add_all([
        models.ProductionResourceCredit(resourceId="listed", audioWorkId="approved-work", creditRole="recording_studio", creditedAs="公開工作室"),
        models.ProductionResourceCredit(resourceId="listed", audioWorkId="pending-work", creditRole="recording_studio", creditedAs="公開工作室"),
    ])
    db_session.commit()
    response = client.get("/api/public-bundle?sections=productionResources")
    assert response.status_code == 200
    assert response.json() == {"productionResources": [{
        "id": "listed", "name": "公開工作室", "categories": ["recording_studio"],
        "summary": "錄音服務", "websiteUrl": "https://example.com/",
        "sourceUrl": "https://example.com/services", "reviewedAt": 1,
        "links": [],
        "works": [{"id": "approved-work", "title": "作品甲", "url": "https://example.com/work", "coverUrl": "https://example.com/cover.jpg", "creditRole": "recording_studio", "creditedAs": "公開工作室"}],
    }]}
    public_bundle_router.invalidate_public_bundle_cache()


def test_public_external_cover_looks_up_one_published_record(client, db_session):
    db_session.add_all([
        models.ExternalPublicScript(
            id="cover-live", sourceUrl="https://example.com/live", status="published",
            remoteCoverUrl="https://example.com/remote.png", coverUrlOverride="/media/curated.webp",
        ),
        models.ExternalPublicScript(
            id="cover-draft", sourceUrl="https://example.com/draft", status="draft",
            remoteCoverUrl="https://example.com/private.png",
        ),
    ])
    db_session.commit()

    from sqlalchemy import event
    queries = []
    connection = db_session.get_bind()

    def on_query(_conn, _cursor, statement, _parameters, _context, _executemany):
        if "external_public_scripts" in statement.lower():
            queries.append(statement)

    event.listen(connection, "before_cursor_execute", on_query)
    try:
        response = client.get("/api/public-external-scripts/cover-live/cover")
    finally:
        event.remove(connection, "before_cursor_execute", on_query)
    assert response.status_code == 200
    assert response.json() == {"coverUrl": "/media/curated.webp"}
    assert len(queries) == 1
    assert client.get("/api/public-external-scripts/cover-draft/cover").status_code == 404
    assert client.get("/api/public-external-scripts/unknown/cover").status_code == 404


def test_public_activity_status_tracks_published_pages(client, db_session):
    assert client.get("/api/public-activity-status").json() == {"hasPublishedActivities": False}
    page = models.ActivityPage(id="activity-1", slug="activity-1", title="Activity", status="draft")
    db_session.add(page)
    db_session.commit()
    assert client.get("/api/public-activity-status").json() == {"hasPublishedActivities": False}
    page.status = "published"
    db_session.commit()
    assert client.get("/api/public-activity-status").json() == {"hasPublishedActivities": True}


def test_public_bundle_builds_once_for_concurrent_readers(monkeypatch):
    public_bundle_router.invalidate_public_bundle_cache()
    builds = []

    def build(_db):
        builds.append(1)
        time.sleep(0.02)
        return {"scripts": [{"id": "same"}]}

    monkeypatch.setattr(public_bundle_router, "_build_bundle", build)
    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(lambda _: public_bundle_router.public_bundle(None), range(8)))

    assert len(builds) == 1
    assert all(response.body == b'{"scripts":[{"id":"same"}]}' for response in responses)
    public_bundle_router.invalidate_public_bundle_cache()


def test_public_bundle_builds_independent_sections_in_parallel(monkeypatch):
    public_bundle_router.invalidate_public_bundle_cache()
    both_started = Barrier(2, timeout=2)

    def build(_db, requested):
        both_started.wait()
        return {key: [] for key in requested}

    monkeypatch.setattr(public_bundle_router, "_build_bundle_sections", build)
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(public_bundle_router.public_bundle, None, "scripts")
        second = pool.submit(public_bundle_router.public_bundle, None, "audioWorks")
        assert first.result(timeout=3).status_code == 200
        assert second.result(timeout=3).status_code == 200
    public_bundle_router.invalidate_public_bundle_cache()


def test_invalidation_during_bundle_build_discards_stale_result(monkeypatch):
    public_bundle_router.invalidate_public_bundle_cache()
    started = Event()
    release = Event()
    builds = []

    def build(_db, _requested):
        builds.append(len(builds) + 1)
        if len(builds) == 1:
            started.set()
            assert release.wait(timeout=2)
        return {"scripts": [{"version": builds[-1]}]}

    monkeypatch.setattr(public_bundle_router, "_build_bundle_sections", build)
    with ThreadPoolExecutor(max_workers=1) as pool:
        pending = pool.submit(public_bundle_router.public_bundle, None, "scripts")
        assert started.wait(timeout=2)
        public_bundle_router.invalidate_public_bundle_cache()
        release.set()
        assert pending.result(timeout=3).body == b'{"scripts":[{"version":2}]}'
    assert builds == [1, 2]
    assert public_bundle_router.public_bundle(None, "scripts").body == b'{"scripts":[{"version":2}]}'
    public_bundle_router.invalidate_public_bundle_cache()


def test_public_bundle_builds_only_requested_sections(client, monkeypatch):
    public_bundle_router.invalidate_public_bundle_cache()
    builds = []

    values = {"scripts": [{"id": "script"}], "organizations": [{"id": "org"}], "audioWorks": [{"id": "audio"}]}

    def build(_db, requested):
        builds.append(requested)
        return {key: values[key] for key in requested if key in values}

    monkeypatch.setattr(public_bundle_router, "_build_bundle_sections", build)
    projected = client.get("/api/public-bundle?sections=audioWorks,organizations")
    assert projected.status_code == 200
    assert projected.json() == {"audioWorks": [{"id": "audio"}], "organizations": [{"id": "org"}]}
    assert client.get("/api/public-bundle").json()["scripts"] == [{"id": "script"}]
    assert builds == [frozenset({"audioWorks", "organizations"}), public_bundle_router._BUNDLE_SECTIONS]
    public_bundle_router.invalidate_public_bundle_cache()


def test_public_bundle_rejects_unknown_or_duplicate_sections(client):
    for query in ("", "scripts,scripts", "privateData", "scripts,privateData"):
        response = client.get(f"/api/public-bundle?sections={query}")
        assert response.status_code == 400


def test_public_bundle_section_cache_is_bounded(client, monkeypatch):
    public_bundle_router.invalidate_public_bundle_cache()
    monkeypatch.setattr(public_bundle_router, "_MAX_CACHED_BUNDLES", 2)
    monkeypatch.setattr(public_bundle_router, "_build_bundle_sections", lambda _db, requested: {key: [] for key in requested})
    for section in ("scripts", "organizations", "audioWorks"):
        assert client.get(f"/api/public-bundle?sections={section}").status_code == 200
    assert len(public_bundle_router._bundle_cache) == 2
    assert client.get("/api/public-bundle").status_code == 200
    public_bundle_router.invalidate_public_bundle_cache()


def test_public_bundle_top_tags_weighted_by_views(client, monkeypatch):
    import routers.public_bundle as pb
    pb._bundle_cache = None

    scripts = [
        SimpleNamespace(views=30, tags=[SimpleNamespace(name="A"), "B"]),
        SimpleNamespace(views=10, tags=["B", "C"]),
        SimpleNamespace(views=0, tags=["D"]),  # fallback score +1
        SimpleNamespace(views=None, tags=["E"]),  # fallback score +1
        SimpleNamespace(views=5, tags=["F"]),  # should be cut by top-5 limit
    ]

    monkeypatch.setattr(public_bundle_router.crud, "get_public_scripts", lambda _db: scripts)
    monkeypatch.setattr(public_bundle_router.public_router, "list_public_personas", lambda _db: [])
    monkeypatch.setattr(public_bundle_router.public_router, "list_public_organizations", lambda _db: [])
    monkeypatch.setattr(public_bundle_router, "_get_banner", lambda _db: {"items": []})

    response = client.get("/api/public-bundle")
    assert response.status_code == 200
    payload = response.json()
    assert payload["topTags"] == ["B", "A", "C", "F", "D"]


def test_public_bundle_includes_banner_from_site_setting(client, monkeypatch):
    import routers.public_bundle as pb
    pb._bundle_cache = None

    monkeypatch.setattr(public_bundle_router.crud, "get_public_scripts", lambda _db: [])
    monkeypatch.setattr(public_bundle_router.public_router, "list_public_personas", lambda _db: [])
    monkeypatch.setattr(public_bundle_router.public_router, "list_public_organizations", lambda _db: [])
    monkeypatch.setattr(
        public_bundle_router,
        "_get_banner",
        lambda _db: {"title": "Test", "content": "", "link": "", "imageUrl": "/media/t.webp", "items": [
            {"id": "s1", "title": "Test", "content": "", "link": "", "imageUrl": "/media/t.webp"},
            {"id": "s2", "title": "Slide 2", "content": "", "link": "", "imageUrl": "/media/t2.webp"},
        ]},
    )

    response = client.get("/api/public-bundle")
    assert response.status_code == 200
    payload = response.json()
    assert "banner" in payload
    assert len(payload["banner"]["items"]) == 2
    assert payload["banner"]["items"][0]["id"] == "s1"


def test_public_bundle_banner_empty_when_no_site_setting(client, monkeypatch):
    import routers.public_bundle as pb
    pb._bundle_cache = None

    monkeypatch.setattr(public_bundle_router.crud, "get_public_scripts", lambda _db: [])
    monkeypatch.setattr(public_bundle_router.public_router, "list_public_personas", lambda _db: [])
    monkeypatch.setattr(public_bundle_router.public_router, "list_public_organizations", lambda _db: [])
    monkeypatch.setattr(public_bundle_router, "_get_banner", lambda _db: {"items": []})

    response = client.get("/api/public-bundle")
    assert response.status_code == 200
    payload = response.json()
    assert payload["banner"] == {"items": []}


def test_public_bundle_ignores_invalid_tag_entries(client, monkeypatch):
    import routers.public_bundle as pb
    pb._bundle_cache = None

    scripts = [
        SimpleNamespace(views=3, tags=[None, SimpleNamespace(name=""), {"name": "dict-ignored"}, "ValidTag"]),
        SimpleNamespace(views=2, tags=[]),
    ]

    monkeypatch.setattr(public_bundle_router.crud, "get_public_scripts", lambda _db: scripts)
    monkeypatch.setattr(public_bundle_router.public_router, "list_public_personas", lambda _db: [{"id": "p1"}])
    monkeypatch.setattr(
        public_bundle_router.public_router,
        "list_public_organizations",
        lambda _db: [{"id": "org1"}],
    )
    monkeypatch.setattr(public_bundle_router, "_get_banner", lambda _db: {"items": []})

    response = client.get("/api/public-bundle")
    assert response.status_code == 200
    payload = response.json()
    assert payload["personas"] == [{"id": "p1"}]
    assert payload["organizations"] == [{"id": "org1"}]
    assert payload["topTags"] == ["ValidTag"]
