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


def test_media_upload_rejects_oversized_file_without_persisting(client, tmp_path, monkeypatch):
    monkeypatch.setenv("MEDIA_STORAGE_ROOT", str(tmp_path / "media"))
    import routers.media as media_router

    monkeypatch.setattr(media_router, "MAX_UPLOAD_BYTES", 8)
    headers = {"X-User-ID": "u1"}

    upload = client.post(
        "/api/media/upload",
        headers=headers,
        files={"file": ("large.webp", b"RIFFxxxxWEBPVP8-TOO-LARGE", "image/webp")},
        data={"purpose": "cover"},
    )
    assert upload.status_code == 413

    listed = client.get("/api/media/items", headers=headers)
    assert listed.status_code == 200
    assert listed.json().get("items", []) == []


def test_media_upload_rejects_mismatched_signature(client, tmp_path, monkeypatch):
    monkeypatch.setenv("MEDIA_STORAGE_ROOT", str(tmp_path / "media"))
    headers = {"X-User-ID": "u1"}

    upload = client.post(
        "/api/media/upload",
        headers=headers,
        files={"file": ("fake.png", b"NOT_A_REAL_PNG_FILE", "image/png")},
        data={"purpose": "cover"},
    )
    assert upload.status_code == 400
    assert "signature" in upload.json().get("detail", "").lower()

    listed = client.get("/api/media/items", headers=headers)
    assert listed.status_code == 200
    assert listed.json().get("items", []) == []


def test_media_static_files_serve_webp_with_an_image_content_type(tmp_path):
    """Cross-origin <img> of an octet-stream + nosniff response is blocked by the browser."""
    import mimetypes

    from fastapi import FastAPI
    from fastapi.staticfiles import StaticFiles
    from fastapi.testclient import TestClient

    from services.media_types import register_media_types

    # Simulate a Python/OS build whose mimetypes table lacks .webp.
    mimetypes.init()
    mimetypes._db.types_map[True].pop(".webp", None)
    assert mimetypes.guess_type("x.webp")[0] is None

    register_media_types()

    (tmp_path / "cover.webp").write_bytes(b"RIFF\x00\x00\x00\x00WEBP")
    app = FastAPI()
    app.mount("/media", StaticFiles(directory=str(tmp_path)), name="media")
    response = TestClient(app).get("/media/cover.webp")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/webp")
