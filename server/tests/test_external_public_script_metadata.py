import services.external_public_script_metadata as metadata_service


def test_google_document_id_and_first_page_preview(monkeypatch):
    source_url = "https://docs.google.com/document/d/google-doc-123/edit?usp=sharing"
    html = """
    <html>
      <head>
        <title>公開台本</title>
        <meta name="author" content="作者甲" />
        <link rel="author" href="/authors/author-a" />
        <meta name="publisher" content="劇團乙" />
        <link rel="publisher" href="/groups/group-b" />
      </head>
    </html>
    """.encode()

    def fake_fetch(url, **_kwargs):
        if "export?format=pdf" in url:
            return url, b"fake-pdf"
        return url, html

    monkeypatch.setattr(metadata_service, "_fetch_url_bytes", fake_fetch)
    monkeypatch.setattr(
        metadata_service,
        "_render_first_page_preview",
        lambda _pdf: "data:image/webp;base64,ZmFrZS1jb3Zlcg==",
    )

    assert metadata_service.google_document_id(source_url) == "google-doc-123"
    result = metadata_service.fetch_external_public_script_metadata(source_url)

    assert result["authorName"] == "作者甲"
    assert result["authorUrl"] == "https://docs.google.com/authors/author-a"
    assert result["organizationName"] == "劇團乙"
    assert result["organizationUrl"] == "https://docs.google.com/groups/group-b"
    assert result["coverPreviewDataUrl"].startswith("data:image/webp;base64,")


def test_external_metadata_resolves_x_profile_avatars(monkeypatch):
    source_url = "https://example.com/script"
    html = """
    <html><head>
      <meta property="og:title" content="公開台本" />
      <meta name="author" content="作者甲" />
      <link rel="author" href="https://x.com/author_a" />
      <meta name="publisher" content="組織乙" />
      <link rel="publisher" href="https://twitter.com/org_b" />
    </head></html>
    """.encode()
    profile_html = {
        "https://x.com/author_a": b'<meta property="og:image" content="https://pbs.twimg.com/profile_images/1/author_400x400.jpg" /><meta name="twitter:description" content="作者介紹 &amp; 公開委託" />',
        "https://x.com/org_b": b'<meta property="og:image" content="https://pbs.twimg.com/profile_images/2/org_400x400.jpg" />',
    }

    def fake_fetch(url, **_kwargs):
        if url == source_url:
            return url, html
        return url, profile_html[url]

    monkeypatch.setattr(metadata_service, "_fetch_url_bytes", fake_fetch)
    result = metadata_service.fetch_external_public_script_metadata(source_url)

    assert result["authorAvatarUrl"] == "https://pbs.twimg.com/profile_images/1/author_400x400.jpg"
    assert result["authorBio"] == "作者介紹 & 公開委託"
    assert result["organizationAvatarUrl"] == "https://pbs.twimg.com/profile_images/2/org_400x400.jpg"


def test_non_google_document_does_not_request_cover_export(monkeypatch):
    calls = []

    def fake_fetch(url, **_kwargs):
        calls.append(url)
        return url, "<html><head><title>外部台本</title></head></html>".encode()

    monkeypatch.setattr(metadata_service, "_fetch_url_bytes", fake_fetch)
    result = metadata_service.fetch_external_public_script_metadata("https://example.com/script")

    assert result["coverPreviewDataUrl"] == ""
    assert calls == ["https://example.com/script"]


def test_google_drive_pdf_uses_downloaded_first_page_cover(monkeypatch):
    source_url = "https://drive.google.com/file/d/drive-file-123/view"
    html = "<html><head><title>單人台本</title></head></html>".encode()
    calls = []

    def fake_fetch(url, **_kwargs):
        calls.append(url)
        if "uc?export=download" in url:
            return url, b"fake-pdf"
        return url, html

    monkeypatch.setattr(metadata_service, "_fetch_url_bytes", fake_fetch)
    monkeypatch.setattr(
        metadata_service,
        "_render_first_page_preview",
        lambda _pdf: "data:image/webp;base64,ZmFrZS1kcml2ZS1jb3Zlcg==",
    )

    assert metadata_service.google_drive_file_id(source_url) == "drive-file-123"
    result = metadata_service.fetch_external_public_script_metadata(source_url)

    assert result["remoteTitle"] == "單人台本"
    assert result["sourceName"] == "Google Drive"
    assert result["coverPreviewDataUrl"].startswith("data:image/webp;base64,")
    assert calls == [source_url, "https://drive.google.com/uc?export=download&id=drive-file-123"]
