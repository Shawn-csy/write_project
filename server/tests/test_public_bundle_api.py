from types import SimpleNamespace

import routers.public_bundle as public_bundle_router


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
