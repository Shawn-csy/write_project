from types import SimpleNamespace

import routers.public_bundle as public_bundle_router


def test_public_bundle_top_tags_weighted_by_views(client, monkeypatch):
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

    response = client.get("/api/public-bundle")
    assert response.status_code == 200
    payload = response.json()
    assert payload["topTags"] == ["B", "A", "C", "F", "D"]


def test_public_bundle_ignores_invalid_tag_entries(client, monkeypatch):
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

    response = client.get("/api/public-bundle")
    assert response.status_code == 200
    payload = response.json()
    assert payload["personas"] == [{"id": "p1"}]
    assert payload["organizations"] == [{"id": "org1"}]
    assert payload["topTags"] == ["ValidTag"]
