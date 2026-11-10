import services.external_public_script_metadata as metadata_service
from routers.external_public_scripts import _safe_image_url, _safe_link_url
import pytest


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
        "https://x.com/author_a": '<meta property="og:image" content="https://pbs.twimg.com/profile_images/1/author_400x400.jpg" /><meta name="twitter:description" content="作者介紹 &amp; 公開委託" />'.encode(),
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


def test_metadata_fetch_connects_only_to_vetted_dns_address(monkeypatch):
    destinations = []

    def public_dns(_host, _port, **_kwargs):
        return [(2, 1, 6, "", ("93.184.216.34", 0))]

    def record_connection(address, *_args):
        destinations.append(address)
        raise OSError("network disabled in test")

    monkeypatch.setattr(metadata_service.socket, "getaddrinfo", public_dns)
    monkeypatch.setattr(metadata_service.socket, "create_connection", record_connection)

    with pytest.raises(metadata_service.ExternalMetadataError):
        metadata_service._fetch_url_bytes(
            "https://example.com/script",
            max_bytes=100,
            accepted_content_types=("text/html",),
            error_message="fetch failed",
        )
    assert destinations == [("93.184.216.34", 443)]


def test_metadata_fetch_tries_only_vetted_fallback_addresses(monkeypatch):
    destinations = []
    monkeypatch.setattr(
        metadata_service.socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: [
            (2, 1, 6, "", ("93.184.216.34", 0)),
            (2, 1, 6, "", ("93.184.216.35", 0)),
        ],
    )

    def fail_connection(address, *_args):
        destinations.append(address)
        raise OSError("network disabled in test")

    monkeypatch.setattr(metadata_service.socket, "create_connection", fail_connection)
    with pytest.raises(metadata_service.ExternalMetadataError):
        metadata_service._fetch_url_bytes(
            "https://example.com/script",
            max_bytes=100,
            accepted_content_types=("text/html",),
            error_message="fetch failed",
        )
    assert destinations == [("93.184.216.34", 443), ("93.184.216.35", 443)]


def test_dns_change_to_private_address_is_rejected_before_connection(monkeypatch):
    dns_answers = iter(["93.184.216.34", "127.0.0.1"])

    def changing_dns(_host, _port, **_kwargs):
        return [(2, 1, 6, "", (next(dns_answers), 0))]

    monkeypatch.setattr(metadata_service.socket, "getaddrinfo", changing_dns)
    monkeypatch.setattr(
        metadata_service.socket,
        "create_connection",
        lambda *_args, **_kwargs: pytest.fail("unsafe connection attempted"),
    )

    with pytest.raises(metadata_service.ExternalMetadataError, match="私有網路"):
        metadata_service.fetch_external_public_script_metadata("https://example.com/script")


@pytest.mark.parametrize("address", ["127.0.0.1", "100.64.0.1", "::ffff:127.0.0.1", "2002:7f00:1::", "64:ff9b::7f00:1"])
def test_metadata_rejects_non_public_network_destinations(monkeypatch, address):
    monkeypatch.setattr(
        metadata_service.socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: [(2, 1, 6, "", (address, 0))],
    )
    with pytest.raises(metadata_service.ExternalMetadataError):
        metadata_service._assert_safe_url("https://example.com/script")


@pytest.mark.parametrize("url", [
    "http://localhost/private",
    "http://127.0.0.1/private",
    "http://100.64.0.1/private",
    "https://[::ffff:127.0.0.1]/private",
    "https://preview.internal/private",
    "https://user:password@example.com/private",
    "https://example.com:invalid/private",
])
def test_external_urls_reject_unsafe_storage_targets(url):
    with pytest.raises(metadata_service.ExternalMetadataError):
        metadata_service.normalize_external_url(url)
    assert _safe_image_url(url) == ""
    assert _safe_link_url(url) == ""


def test_external_urls_keep_valid_public_and_local_media_targets():
    assert _safe_image_url("https://example.com/cover.jpg") == "https://example.com/cover.jpg"
    assert _safe_link_url("https://example.com/work") == "https://example.com/work"
    assert _safe_image_url("/media/external-public-scripts/cover.webp") == "/media/external-public-scripts/cover.webp"
