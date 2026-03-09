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
