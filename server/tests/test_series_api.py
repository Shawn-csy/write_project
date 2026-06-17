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


# ─── Batch reorder ────────────────────────────────────────────────────────────

def _setup_series_with_scripts(client, owner_id: str):
    """Helper: create a series and attach two scripts. Returns (series_id, sc1_id, sc2_id)."""
    headers = {"X-User-ID": owner_id}

    sc1 = client.post("/api/scripts", json={"title": "Chapter 1"}, headers=headers)
    assert sc1.status_code == 200
    sc1_id = sc1.json()["id"]

    sc2 = client.post("/api/scripts", json={"title": "Chapter 2"}, headers=headers)
    assert sc2.status_code == 200
    sc2_id = sc2.json()["id"]

    series = client.post("/api/series", json={"name": "My Series"}, headers=headers)
    assert series.status_code == 200
    series_id = series.json()["id"]

    # Attach scripts to series
    client.put(f"/api/scripts/{sc1_id}", json={"seriesId": series_id, "seriesOrder": 1}, headers=headers)
    client.put(f"/api/scripts/{sc2_id}", json={"seriesId": series_id, "seriesOrder": 2}, headers=headers)

    return series_id, sc1_id, sc2_id


def test_reorder_series_scripts_success(client):
    owner = "reorder-owner"
    headers = {"X-User-ID": owner}
    series_id, sc1_id, sc2_id = _setup_series_with_scripts(client, owner)

    resp = client.put(
        f"/api/series/{series_id}/scripts/reorder",
        json={"items": [
            {"scriptId": sc1_id, "seriesOrder": 10},
            {"scriptId": sc2_id, "seriesOrder": 20},
        ]},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Verify seriesOrder updated on scripts
    sc1_data = client.get(f"/api/scripts/{sc1_id}", headers=headers).json()
    sc2_data = client.get(f"/api/scripts/{sc2_id}", headers=headers).json()
    assert sc1_data["seriesOrder"] == 10
    assert sc2_data["seriesOrder"] == 20


def test_reorder_series_scripts_null_order(client):
    owner = "reorder-null-owner"
    headers = {"X-User-ID": owner}
    series_id, sc1_id, _ = _setup_series_with_scripts(client, owner)

    resp = client.put(
        f"/api/series/{series_id}/scripts/reorder",
        json={"items": [{"scriptId": sc1_id, "seriesOrder": None}]},
        headers=headers,
    )
    assert resp.status_code == 200

    sc1_data = client.get(f"/api/scripts/{sc1_id}", headers=headers).json()
    assert sc1_data["seriesOrder"] is None


def test_reorder_series_scripts_series_not_found(client):
    headers = {"X-User-ID": "reorder-owner-2"}
    resp = client.put(
        "/api/series/nonexistent/scripts/reorder",
        json={"items": [{"scriptId": "any", "seriesOrder": 1}]},
        headers=headers,
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_reorder_series_scripts_script_not_in_series(client):
    owner = "reorder-owner-3"
    headers = {"X-User-ID": owner}
    series_id, sc1_id, _ = _setup_series_with_scripts(client, owner)

    # Create a script NOT in the series
    outsider = client.post("/api/scripts", json={"title": "Outsider"}, headers=headers)
    outsider_id = outsider.json()["id"]

    resp = client.put(
        f"/api/series/{series_id}/scripts/reorder",
        json={"items": [{"scriptId": outsider_id, "seriesOrder": 5}]},
        headers=headers,
    )
    assert resp.status_code == 404
    assert "not found in series" in resp.json()["detail"].lower()


def test_reorder_series_scripts_cannot_update_others_script(client):
    owner = "reorder-owner-4"
    other = "reorder-other-4"

    # Owner creates series + script
    series_id, sc1_id, _ = _setup_series_with_scripts(client, owner)

    # Other user tries to reorder owner's series script
    resp = client.put(
        f"/api/series/{series_id}/scripts/reorder",
        json={"items": [{"scriptId": sc1_id, "seriesOrder": 99}]},
        headers={"X-User-ID": other},
    )
    assert resp.status_code == 404  # series not found for other user


def test_reorder_series_scripts_partial_invalid_leaves_no_mutation(client):
    """First item valid, second item not in series — neither should be updated."""
    owner = "reorder-owner-5"
    headers = {"X-User-ID": owner}
    series_id, sc1_id, _ = _setup_series_with_scripts(client, owner)

    outsider = client.post("/api/scripts", json={"title": "Outsider"}, headers=headers)
    outsider_id = outsider.json()["id"]

    resp = client.put(
        f"/api/series/{series_id}/scripts/reorder",
        json={"items": [
            {"scriptId": sc1_id, "seriesOrder": 99},      # valid
            {"scriptId": outsider_id, "seriesOrder": 1},  # not in series
        ]},
        headers=headers,
    )
    assert resp.status_code == 404

    # sc1 must NOT have been updated to 99
    sc1_data = client.get(f"/api/scripts/{sc1_id}", headers=headers).json()
    assert sc1_data["seriesOrder"] == 1  # original order from _setup_series_with_scripts
