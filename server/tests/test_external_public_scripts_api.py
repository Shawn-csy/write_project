import routers.external_public_scripts as external_router


def _metadata(url: str) -> dict[str, str]:
    return {
        "sourceUrl": url,
        "canonicalUrl": url.rstrip("/") + "/canonical",
        "sourceDomain": "example.com",
        "sourceName": "Example",
        "remoteTitle": "外部公開台本",
        "remoteSummary": "這是一段公開台本摘要。",
        "remoteCoverUrl": "https://example.com/cover.jpg",
    }


def test_external_public_script_preview_and_admin_crud(client, monkeypatch):
    monkeypatch.setattr(
        external_router,
        "fetch_external_public_script_metadata",
        lambda url: _metadata(url),
    )
    headers = {"X-User-ID": "admin-owner"}
    source_url = "https://example.com/scripts/one"

    preview = client.post(
        "/api/admin/external-public-scripts/preview",
        json={"sourceUrl": source_url},
        headers=headers,
    )
    assert preview.status_code == 200
    assert preview.json()["remoteTitle"] == "外部公開台本"

    created = client.post(
        "/api/admin/external-public-scripts",
        json={
            "sourceUrl": source_url,
            "categories": ["奇幻", "短篇", "奇幻"],
            "status": "published",
        },
        headers=headers,
    )
    assert created.status_code == 200
    item = created.json()
    assert item["title"] == "外部公開台本"
    assert item["coverUrl"] == "https://example.com/cover.jpg"
    assert item["categories"] == ["奇幻", "短篇"]

    duplicate = client.post(
        "/api/admin/external-public-scripts",
        json={"sourceUrl": source_url},
        headers=headers,
    )
    assert duplicate.status_code == 409

    updated = client.put(
        f"/api/admin/external-public-scripts/{item['id']}",
        json={"titleOverride": "我改過的標題", "categories": ["配音"], "status": "draft"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "我改過的標題"
    assert updated.json()["status"] == "draft"

    listed = client.get("/api/admin/external-public-scripts", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    deleted = client.delete(
        f"/api/admin/external-public-scripts/{item['id']}",
        headers=headers,
    )
    assert deleted.status_code == 200
    assert deleted.json()["success"] is True


def test_public_bundle_only_exposes_published_external_scripts(client, monkeypatch):
    import routers.public_bundle as public_bundle_router

    monkeypatch.setattr(
        external_router,
        "fetch_external_public_script_metadata",
        lambda url: _metadata(url),
    )
    public_bundle_router._bundle_cache = None
    headers = {"X-User-ID": "admin-owner"}

    for index, status in enumerate(("published", "draft"), start=1):
        response = client.post(
            "/api/admin/external-public-scripts",
            json={
                "sourceUrl": f"https://example.com/scripts/{index}",
                "status": status,
            },
            headers=headers,
        )
        assert response.status_code == 200

    public_bundle_router._bundle_cache = None
    response = client.get("/api/public-bundle")
    assert response.status_code == 200
    items = response.json()["externalPublicScripts"]
    assert len(items) == 1
    assert items[0]["status"] == "published"


def test_google_cover_is_saved_to_named_media_folder(client, monkeypatch, tmp_path):
    import os

    monkeypatch.setenv("MEDIA_STORAGE_ROOT", str(tmp_path))
    monkeypatch.setattr(
        external_router,
        "fetch_external_public_script_metadata",
        lambda url: {
            **_metadata(url),
            "remoteTitle": "我的 Google 台本",
            "coverPreviewDataUrl": "data:image/webp;base64,ZmFrZS1jb3Zlcg==",
        },
    )
    monkeypatch.setattr(external_router, "is_google_docs_url", lambda _url: True)

    response = client.post(
        "/api/admin/external-public-scripts",
        json={
            "sourceUrl": "https://docs.google.com/document/d/google-doc-123/edit",
            "titleOverride": "我的 Google 台本",
            "status": "published",
        },
        headers={"X-User-ID": "admin-owner"},
    )

    assert response.status_code == 200
    item = response.json()
    assert "/admin-owner/外部台本封面/我的 Google 台本-" in item["coverUrl"]
    cover_path = tmp_path / "admin-owner" / "外部台本封面" / item["coverUrl"].rsplit("/", 1)[-1]
    assert cover_path.is_file()
    assert os.path.getsize(cover_path) > 0


def test_google_drive_page_block_falls_back_to_pdf_download(client, monkeypatch):
    def blocked_page(_url):
        raise external_router.ExternalMetadataError("file page blocked")

    monkeypatch.setattr(external_router, "fetch_external_public_script_metadata", blocked_page)
    monkeypatch.setattr(
        external_router,
        "fetch_google_drive_file_cover_preview",
        lambda _url: "data:image/webp;base64,ZmFrZS1kcml2ZS1jb3Zlcg==",
    )

    response = client.post(
        "/api/admin/external-public-scripts",
        json={
            "sourceUrl": "https://drive.google.com/file/d/drive-file-123/view",
            "titleOverride": "巧克力",
            "status": "published",
        },
        headers={"X-User-ID": "admin-owner"},
    )

    assert response.status_code == 200
    item = response.json()
    assert item["title"] == "巧克力"
    assert item["sourceName"] == "Google Drive"
    assert item["coverUrl"].startswith("/media/admin-owner/外部台本封面/")


def test_social_avatars_are_saved_to_media_library(client, monkeypatch, tmp_path):
    monkeypatch.setenv("MEDIA_STORAGE_ROOT", str(tmp_path))
    monkeypatch.setattr(
        external_router,
        "fetch_external_public_script_metadata",
        lambda url: {
            **_metadata(url),
            "authorName": "作者甲",
            "authorUrl": "https://x.com/author_a",
            "authorAvatarUrl": "https://pbs.twimg.com/profile_images/1/author_400x400.jpg",
            "organizationName": "組織乙",
            "organizationUrl": "https://x.com/org_b",
            "organizationAvatarUrl": "https://pbs.twimg.com/profile_images/2/org_400x400.jpg",
        },
    )
    monkeypatch.setattr(
        external_router,
        "fetch_social_avatar_image",
        lambda url: (url, b"fake-image"),
    )

    response = client.post(
        "/api/admin/external-public-scripts",
        json={"sourceUrl": "https://example.com/scripts/avatar", "status": "published"},
        headers={"X-User-ID": "admin-owner"},
    )

    assert response.status_code == 200
    item = response.json()
    assert item["authorAvatarUrl"].startswith("/media/admin-owner/外部台本圖片/")
    assert item["organizationAvatarUrl"].startswith("/media/admin-owner/外部台本圖片/")
    assert (tmp_path / "admin-owner" / "外部台本圖片").is_dir()
    assert len(list((tmp_path / "admin-owner" / "外部台本圖片").iterdir())) == 2
