def test_series_crud_and_slug_uniqueness(client):
    headers = {"X-User-ID": "series-owner"}

    first = client.post(
        "/api/series",
        json={"name": "我的系列", "summary": "S1", "coverUrl": "https://example.com/a.jpg"},
        headers=headers,
    )
    assert first.status_code == 200
    first_data = first.json()
    assert first_data["name"] == "我的系列"
    assert first_data["slug"] == "我的系列"
    assert first_data["scriptCount"] == 0

    second = client.post(
        "/api/series",
        json={"name": "我的系列", "summary": "S2"},
        headers=headers,
    )
    assert second.status_code == 200
    second_data = second.json()
    assert second_data["slug"] == "我的系列-2"

    listing = client.get("/api/series", headers=headers)
    assert listing.status_code == 200
    ids = [item["id"] for item in listing.json()]
    assert first_data["id"] in ids
    assert second_data["id"] in ids

    update = client.put(
        f"/api/series/{first_data['id']}",
        json={"name": "我的系列", "summary": "updated summary", "coverUrl": "https://example.com/new.jpg"},
        headers=headers,
    )
    assert update.status_code == 200
    updated = update.json()
    assert updated["summary"] == "updated summary"
    assert updated["coverUrl"] == "https://example.com/new.jpg"
    assert updated["slug"] == "我的系列"

    remove = client.delete(f"/api/series/{second_data['id']}", headers=headers)
    assert remove.status_code == 200
    assert remove.json()["success"] is True


def test_series_update_and_delete_not_found(client):
    headers = {"X-User-ID": "series-owner"}

    update_missing = client.put(
        "/api/series/not-exists",
        json={"name": "x"},
        headers=headers,
    )
    assert update_missing.status_code == 404
    assert update_missing.json()["detail"] == "Series not found"

    delete_missing = client.delete("/api/series/not-exists", headers=headers)
    assert delete_missing.status_code == 404
    assert delete_missing.json()["detail"] == "Series not found"
