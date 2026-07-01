def test_admin_homepage_banner_supports_multi_items(client):
    headers = {"X-User-ID": "admin-owner"}
    payload = {
        "items": [
            {
                "id": "s1",
                "title": "Banner 1",
                "content": "Content 1",
                "link": "https://example.com/1",
                "imageUrl": "/media/admin-owner/banner/1.webp",
            },
            {
                "id": "s2",
                "title": "Banner 2",
                "content": "Content 2",
                "link": "https://example.com/2",
                "imageUrl": "/media/admin-owner/banner/2.webp",
            },
        ]
    }

    put_res = client.put("/api/admin/homepage-banner", json=payload, headers=headers)
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert "items" in put_data
    assert len(put_data["items"]) == 2

    get_admin_res = client.get("/api/admin/homepage-banner", headers=headers)
    assert get_admin_res.status_code == 200
    get_admin_data = get_admin_res.json()
    assert len(get_admin_data.get("items", [])) == 2
    assert get_admin_data["items"][0]["title"] == "Banner 1"
    assert get_admin_data["items"][1]["title"] == "Banner 2"

    get_public_res = client.get("/api/public-homepage-banner")
    assert get_public_res.status_code == 200
    get_public_data = get_public_res.json()
    assert len(get_public_data.get("items", [])) == 2
    assert get_public_data["items"][0]["title"] == "Banner 1"


def test_non_admin_cannot_update_homepage_banner(client):
    headers = {"X-User-ID": "normal-user"}
    res = client.put("/api/admin/homepage-banner", json={"items": []}, headers=headers)
    assert res.status_code == 403


def test_hero_placement_fields_preserved_round_trip(client):
    """Phase 1: imageAlt, imageCrop, imageMobileCrop, imageDesktopCrop,
    imageUltraWideCrop, and imageBackgroundMode must survive admin save + public read."""
    headers = {"X-User-ID": "admin-owner"}
    crop = {"cx": 0.1, "cy": -0.2, "zoom": 1.5}
    payload = {
        "items": [
            {
                "id": "p1",
                "title": "Placement Test",
                "imageUrl": "/media/test.webp",
                "imageAlt": "Test banner",
                "imageCrop": crop,
                "imageMobileCrop": {"cx": -0.3, "cy": 0.0, "zoom": 1.0},
                "imageDesktopCrop": {"cx": 0.0, "cy": 0.1, "zoom": 1.2},
                "imageUltraWideCrop": {"cx": 0.2, "cy": 0.0, "zoom": 1.0},
                "imageBackgroundMode": "blur-fill",
            }
        ]
    }

    put_res = client.put("/api/admin/homepage-banner", json=payload, headers=headers)
    assert put_res.status_code == 200

    # Admin read-back
    get_admin = client.get("/api/admin/homepage-banner", headers=headers)
    assert get_admin.status_code == 200
    item = get_admin.json()["items"][0]
    assert item["imageAlt"] == "Test banner"
    assert item["imageCrop"] == crop
    assert item["imageMobileCrop"] == {"cx": -0.3, "cy": 0.0, "zoom": 1.0}
    assert item["imageDesktopCrop"] == {"cx": 0.0, "cy": 0.1, "zoom": 1.2}
    assert item["imageUltraWideCrop"] == {"cx": 0.2, "cy": 0.0, "zoom": 1.0}
    assert item["imageBackgroundMode"] == "blur-fill"

    # Public endpoint read-back
    get_public = client.get("/api/public-homepage-banner")
    assert get_public.status_code == 200
    pub_item = get_public.json()["items"][0]
    assert pub_item["imageAlt"] == "Test banner"
    assert pub_item["imageCrop"] == crop
    assert pub_item["imageBackgroundMode"] == "blur-fill"


def test_hero_placement_cover_mode_preserved(client):
    headers = {"X-User-ID": "admin-owner"}
    payload = {
        "items": [{"id": "c1", "title": "Cover", "imageUrl": "/media/c.webp", "imageBackgroundMode": "cover"}]
    }
    client.put("/api/admin/homepage-banner", json=payload, headers=headers)
    get_res = client.get("/api/public-homepage-banner")
    assert get_res.json()["items"][0]["imageBackgroundMode"] == "cover"


def test_hero_placement_unknown_bg_mode_not_preserved(client):
    headers = {"X-User-ID": "admin-owner"}
    payload = {
        "items": [{"id": "u1", "title": "Bad mode", "imageUrl": "/media/u.webp", "imageBackgroundMode": "stretch"}]
    }
    client.put("/api/admin/homepage-banner", json=payload, headers=headers)
    get_res = client.get("/api/public-homepage-banner")
    item = get_res.json()["items"][0]
    assert item.get("imageBackgroundMode") is None


def test_hero_placement_fields_absent_on_legacy_items(client):
    """Legacy items without placement fields must not error and must not emit null crop keys."""
    headers = {"X-User-ID": "admin-owner"}
    payload = {
        "items": [{"id": "leg1", "title": "Legacy", "imageUrl": "/media/leg.webp"}]
    }
    client.put("/api/admin/homepage-banner", json=payload, headers=headers)
    get_res = client.get("/api/public-homepage-banner")
    item = get_res.json()["items"][0]
    assert item.get("imageCrop") is None
    assert item.get("imageMobileCrop") is None
    assert item.get("imageBackgroundMode") is None


def test_admin_put_invalidates_public_bundle_cache(client):
    """PUT /api/admin/homepage-banner must invalidate _bundle_cache so the next
    /api/public-bundle reflects new banner placement fields without a 60s wait."""
    import routers.public_bundle as pb

    headers = {"X-User-ID": "admin-owner"}

    # Seed an initial banner and warm the bundle cache.
    client.put(
        "/api/admin/homepage-banner",
        json={"items": [{"id": "bc1", "title": "Old", "imageUrl": "/media/old.webp"}]},
        headers=headers,
    )
    pb._bundle_cache = None  # ensure cache starts cold for this test
    first = client.get("/api/public-bundle")
    assert first.status_code == 200
    assert pb._bundle_cache is not None  # cache is now warm

    # Update the banner with placement fields.
    new_payload = {
        "items": [
            {
                "id": "bc2",
                "title": "New",
                "imageUrl": "/media/new.webp",
                "imageBackgroundMode": "blur-fill",
                "imageUltraWideCrop": {"cx": 0.1, "cy": 0.0, "zoom": 1.2},
            }
        ]
    }
    put_res = client.put("/api/admin/homepage-banner", json=new_payload, headers=headers)
    assert put_res.status_code == 200

    # Cache must have been cleared by the PUT handler.
    assert pb._bundle_cache is None

    # Next bundle read must reflect the updated banner.
    second = client.get("/api/public-bundle")
    assert second.status_code == 200
    banner_items = second.json().get("banner", {}).get("items", [])
    assert len(banner_items) == 1
    assert banner_items[0]["title"] == "New"
    assert banner_items[0].get("imageBackgroundMode") == "blur-fill"
    assert banner_items[0].get("imageUltraWideCrop") == {"cx": 0.1, "cy": 0.0, "zoom": 1.2}
