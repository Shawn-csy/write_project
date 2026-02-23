def test_media_upload_list_delete_flow(client, tmp_path, monkeypatch):
    monkeypatch.setenv("MEDIA_STORAGE_ROOT", str(tmp_path / "media"))
    headers = {"X-User-ID": "u1"}

    upload = client.post(
        "/api/media/upload",
        headers=headers,
        files={"file": ("sample.webp", b"RIFFxxxxWEBPVP8 ", "image/webp")},
        data={"purpose": "cover"},
    )
    assert upload.status_code == 200
    payload = upload.json()
    assert payload["url"].startswith("/media/u1/cover/")

    listed = client.get("/api/media/items", headers=headers)
    assert listed.status_code == 200
    items = listed.json().get("items", [])
    assert len(items) == 1
    assert items[0]["url"] == payload["url"]

    removed = client.request(
        "DELETE",
        "/api/media/items",
        headers=headers,
        json={"url": payload["url"]},
    )
    assert removed.status_code == 200
    assert removed.json().get("success") is True

    listed_after = client.get("/api/media/items", headers=headers)
    assert listed_after.status_code == 200
    assert listed_after.json().get("items", []) == []

