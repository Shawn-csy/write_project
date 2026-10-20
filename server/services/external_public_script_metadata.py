"""Fetch safe, lightweight metadata for an external public-script page."""

from __future__ import annotations

import base64
import ipaddress
import re
import socket
from html import unescape
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_METADATA_BYTES = 2 * 1024 * 1024
MAX_GOOGLE_DOC_PDF_BYTES = 10 * 1024 * 1024
FETCH_TIMEOUT_SECONDS = 8
USER_AGENT = "PublicScriptAggregator/1.0 (+metadata preview)"
GOOGLE_DOC_ID_PATTERN = re.compile(r"/document/(?:u/\d+/)?d/([a-zA-Z0-9_-]+)")
GOOGLE_DRIVE_FILE_ID_PATTERN = re.compile(r"/file/d/([a-zA-Z0-9_-]+)")
X_PROFILE_HOSTS = {"x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"}
X_PROFILE_IMAGE_PATTERN = re.compile(
    r"https://pbs\.twimg\.com/profile_images/[A-Za-z0-9_./-]+(?:\?[A-Za-z0-9=&._%-]+)?",
    re.IGNORECASE,
)


class ExternalMetadataError(ValueError):
    """A user-actionable error while validating or reading an external page."""


def normalize_external_url(raw_url: str) -> str:
    value = str(raw_url or "").strip()
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ExternalMetadataError("請輸入完整的 http:// 或 https:// 網址。")
    if parsed.username or parsed.password:
        raise ExternalMetadataError("網址不可包含登入帳號或密碼。")
    return value


def _assert_public_hostname(hostname: str) -> None:
    host = str(hostname or "").strip().lower().rstrip(".")
    if not host or host in {"localhost", "localhost.localdomain"} or host.endswith(".localhost"):
        raise ExternalMetadataError("為了安全，不能讀取本機網址。")

    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(host, None)}
    except socket.gaierror as exc:
        raise ExternalMetadataError("找不到這個網址的主機。") from exc

    for address in addresses:
        ip = ipaddress.ip_address(address)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ExternalMetadataError("為了安全，不能讀取內部或私有網路網址。")


def _assert_safe_url(url: str) -> str:
    normalized = normalize_external_url(url)
    parsed = urlparse(normalized)
    _assert_public_hostname(parsed.hostname or "")
    return normalized


class _SafeRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req: Request, fp: Any, code: int, msg: str, headers: Any, newurl: str):
        _assert_safe_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class _MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.title_parts: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): str(value or "") for key, value in attrs}
        if tag.lower() == "meta":
            self.meta.append(values)
        elif tag.lower() == "link":
            self.links.append(values)
        elif tag.lower() == "title":
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data)

    def meta_value(self, *, property_name: str = "", name: str = "") -> str:
        key = "property" if property_name else "name"
        expected = property_name if property_name else name
        for tag in self.meta:
            if tag.get(key, "").strip().lower() == expected.lower():
                return unescape(tag.get("content", "").strip())
        return ""

    def canonical_href(self) -> str:
        for link in self.links:
            rel = {part.strip().lower() for part in link.get("rel", "").split()}
            if "canonical" in rel:
                return link.get("href", "").strip()
        return ""

    def relation_href(self, relation: str) -> str:
        for link in self.links:
            rel = {part.strip().lower() for part in link.get("rel", "").split()}
            if relation.lower() in rel:
                return link.get("href", "").strip()
        return ""


def _absolute_http_url(raw: str, base_url: str) -> str:
    value = str(raw or "").strip()
    if not value:
        return ""
    absolute = urljoin(base_url, value)
    parsed = urlparse(absolute)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return ""
    # Do not resolve image hosts here.  The page itself is the SSRF-sensitive
    # request; the public UI will render unknown image hosts as plain <img>.
    return absolute


def google_document_id(raw_url: str) -> str:
    """Return a Google Docs document id, or an empty string for other URLs."""

    try:
        normalized = normalize_external_url(raw_url)
    except ExternalMetadataError:
        return ""
    parsed = urlparse(normalized)
    if parsed.hostname not in {"docs.google.com", "www.docs.google.com"}:
        return ""
    match = GOOGLE_DOC_ID_PATTERN.search(parsed.path)
    return match.group(1) if match else ""


def is_google_docs_url(raw_url: str) -> bool:
    return bool(google_document_id(raw_url))


def google_drive_file_id(raw_url: str) -> str:
    """Return a Google Drive file id for a /file/d/... URL."""

    try:
        normalized = normalize_external_url(raw_url)
    except ExternalMetadataError:
        return ""
    parsed = urlparse(normalized)
    if parsed.hostname not in {"drive.google.com", "www.drive.google.com"}:
        return ""
    match = GOOGLE_DRIVE_FILE_ID_PATTERN.search(parsed.path)
    if match:
        return match.group(1)
    query_id = parse_qs(parsed.query).get("id", [""])[0]
    return query_id if re.fullmatch(r"[a-zA-Z0-9_-]+", query_id or "") else ""


def is_google_drive_file_url(raw_url: str) -> bool:
    return bool(google_drive_file_id(raw_url))


def _fetch_url_bytes(
    url: str,
    *,
    max_bytes: int,
    accepted_content_types: tuple[str, ...],
    error_message: str,
) -> tuple[str, bytes]:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": ",".join(accepted_content_types) + ";q=0.9,*/*;q=0.1",
        },
    )
    opener = build_opener(_SafeRedirectHandler())
    try:
        with opener.open(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
            final_url = _assert_safe_url(response.geturl())
            content_type = str(response.headers.get("content-type") or "").lower()
            if content_type and not any(kind in content_type for kind in accepted_content_types):
                raise ExternalMetadataError(error_message)
            body = response.read(max_bytes + 1)
    except ExternalMetadataError:
        raise
    except Exception as exc:
        raise ExternalMetadataError(error_message) from exc

    if len(body) > max_bytes:
        raise ExternalMetadataError(error_message)
    return final_url, body


def fetch_social_avatar_url(raw_profile_url: str) -> str:
    """Find the current public profile image for an X/Twitter profile.

    Unavatar is convenient for a browser fallback, but it is rate-limited and
    can return an error for otherwise valid profiles. X embeds the public
    profile image URL in its profile HTML, so use that URL when available.
    This helper is intentionally limited to X/Twitter profile URLs and is
    best-effort: an unavailable profile must not prevent a script from being
    imported.
    """

    return fetch_social_profile(raw_profile_url).get("avatarUrl", "")


def fetch_social_bio(raw_profile_url: str) -> str:
    """Read the public profile description from an X/Twitter profile."""

    return fetch_social_profile(raw_profile_url).get("bio", "")


def fetch_social_profile(raw_profile_url: str) -> dict[str, str]:
    """Read public X/Twitter profile metadata without requiring an API token."""

    value = str(raw_profile_url or "").strip()
    try:
        normalized = normalize_external_url(value)
    except ExternalMetadataError:
        return {}
    parsed = urlparse(normalized)
    hostname = (parsed.hostname or "").lower().rstrip(".")
    if hostname not in X_PROFILE_HOSTS:
        return {}
    handle = next((part for part in parsed.path.split("/") if part), "")
    if not re.fullmatch(r"[A-Za-z0-9_]+", handle):
        return {}

    try:
        _, body = _fetch_url_bytes(
            f"https://x.com/{handle}",
            max_bytes=MAX_METADATA_BYTES,
            accepted_content_types=("text/html", "application/xhtml+xml"),
            error_message="無法讀取 X 作者頁面的公開資料。",
        )
    except ExternalMetadataError:
        return {}

    html = unescape(body.decode("utf-8", errors="replace")).replace("\\/", "/")
    profile_parser = _MetadataParser()
    try:
        profile_parser.feed(html)
        profile_parser.close()
    except Exception:
        profile_parser = _MetadataParser()

    bio = (
        profile_parser.meta_value(name="twitter:description")
        or profile_parser.meta_value(property_name="og:description")
        or profile_parser.meta_value(name="description")
    ).strip()
    matches = X_PROFILE_IMAGE_PATTERN.findall(html)
    avatar_url = ""
    if matches:
        # Prefer a square profile-size variant when X exposes several formats.
        matches.sort(key=lambda url: ("_400x400" not in url, "_200x200" not in url, len(url)))
        avatar_url = matches[0].rstrip(".,;\")'>")[:2000]
    return {"avatarUrl": avatar_url, "bio": bio[:2000]}


def fetch_social_avatar_image(raw_image_url: str) -> tuple[str, bytes]:
    """Download a discovered X avatar so the caller can store it locally."""

    try:
        normalized = normalize_external_url(raw_image_url)
    except ExternalMetadataError:
        return "", b""
    hostname = (urlparse(normalized).hostname or "").lower().rstrip(".")
    if hostname != "pbs.twimg.com":
        return "", b""
    try:
        final_url, body = _fetch_url_bytes(
            normalized,
            max_bytes=5 * 1024 * 1024,
            accepted_content_types=("image/jpeg", "image/png", "image/webp"),
            error_message="無法下載 X 公開頭像圖片。",
        )
        return final_url, body
    except ExternalMetadataError:
        return normalized, b""


def _render_first_page_preview(pdf_bytes: bytes) -> str:
    try:
        import fitz
    except Exception as exc:
        raise ExternalMetadataError("目前無法產生 Google 文件封面，請稍後再試。") from exc

    document = None
    try:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
        if document.page_count < 1:
            raise ExternalMetadataError("Google 文件沒有可用的第一頁。")
        page = document.load_page(0)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
        image_bytes = pixmap.pil_tobytes(format="WEBP", optimize=True, quality=82)
        if len(image_bytes) > 2 * 1024 * 1024:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.0, 1.0), alpha=False)
            image_bytes = pixmap.pil_tobytes(format="WEBP", optimize=True, quality=78)
    except ExternalMetadataError:
        raise
    except Exception as exc:
        raise ExternalMetadataError("Google 文件第一頁無法轉成封面圖片。") from exc
    finally:
        if document is not None:
            document.close()

    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:image/webp;base64,{encoded}"


def fetch_google_docs_cover_preview(raw_url: str) -> str:
    document_id = google_document_id(raw_url)
    if not document_id:
        return ""
    export_url = f"https://docs.google.com/document/d/{document_id}/export?format=pdf"
    try:
        _, pdf_bytes = _fetch_url_bytes(
            export_url,
            max_bytes=MAX_GOOGLE_DOC_PDF_BYTES,
            accepted_content_types=("application/pdf",),
            error_message="無法取得 Google 文件，請確認文件設定為知道連結的任何人都能查看。",
        )
        return _render_first_page_preview(pdf_bytes)
    except ExternalMetadataError:
        raise


def fetch_google_drive_file_cover_preview(raw_url: str) -> str:
    file_id = google_drive_file_id(raw_url)
    if not file_id:
        return ""
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    try:
        _, pdf_bytes = _fetch_url_bytes(
            download_url,
            max_bytes=MAX_GOOGLE_DOC_PDF_BYTES,
            accepted_content_types=("application/pdf", "application/octet-stream"),
            error_message="無法取得 Google Drive 檔案，請確認檔案設定為知道連結的任何人都能查看。",
        )
        return _render_first_page_preview(pdf_bytes)
    except ExternalMetadataError:
        raise


def fetch_external_public_script_metadata(raw_url: str) -> dict[str, str]:
    """Fetch OG/title metadata without downloading the article body."""

    source_url = _assert_safe_url(raw_url)
    final_url, body = _fetch_url_bytes(
        source_url,
        max_bytes=MAX_METADATA_BYTES,
        accepted_content_types=("text/html", "application/xhtml+xml"),
        error_message="無法讀取這個網址，請確認頁面可以公開存取。",
    )

    try:
        html = body.decode("utf-8", errors="replace")
        parser = _MetadataParser()
        parser.feed(html)
        parser.close()
    except Exception as exc:
        raise ExternalMetadataError("文章頁面格式無法解析。") from exc

    title = parser.meta_value(property_name="og:title")
    if not title:
        title = parser.meta_value(name="twitter:title")
    if not title:
        title = " ".join("".join(parser.title_parts).split())

    summary = parser.meta_value(property_name="og:description")
    if not summary:
        summary = parser.meta_value(name="description")
    if not summary:
        summary = parser.meta_value(name="twitter:description")

    cover = parser.meta_value(property_name="og:image")
    if not cover:
        cover = parser.meta_value(name="twitter:image")
    cover = _absolute_http_url(cover, final_url)

    canonical = _absolute_http_url(parser.canonical_href(), final_url)
    canonical = canonical or final_url

    source_name = parser.meta_value(property_name="og:site_name")
    source_domain = urlparse(canonical).hostname or urlparse(final_url).hostname or ""
    author_value = (
        parser.meta_value(name="author")
        or parser.meta_value(property_name="article:author")
        or parser.meta_value(name="twitter:creator")
    )
    author_url = parser.relation_href("author")
    if author_value.startswith(("http://", "https://")):
        author_url = author_url or _absolute_http_url(author_value, final_url)
        author_value = ""
    organization_value = (
        parser.meta_value(property_name="article:publisher")
        or parser.meta_value(name="publisher")
        or parser.meta_value(name="organization")
    )
    organization_url = parser.relation_href("publisher") or parser.relation_href("organization")
    if organization_value.startswith(("http://", "https://")):
        organization_url = organization_url or _absolute_http_url(organization_value, final_url)
        organization_value = ""
    social_cache: dict[str, dict[str, str]] = {}

    def social_for(profile_url: str) -> dict[str, str]:
        normalized_profile_url = str(profile_url or "").strip()
        if not normalized_profile_url:
            return {}
        if normalized_profile_url not in social_cache:
            social_cache[normalized_profile_url] = fetch_social_profile(normalized_profile_url)
        return social_cache[normalized_profile_url]

    def avatar_for(profile_url: str) -> str:
        return social_for(profile_url).get("avatarUrl", "")

    def bio_for(profile_url: str) -> str:
        return social_for(profile_url).get("bio", "")

    resolved_author_url = _absolute_http_url(author_url, final_url)[:2000]
    resolved_organization_url = _absolute_http_url(organization_url, final_url)[:2000]
    google_docs = is_google_docs_url(source_url)
    google_drive_file = is_google_drive_file_url(source_url)
    google_source = google_docs or google_drive_file
    if google_source:
        source_name = source_name or ("Google Docs" if google_docs else "Google Drive")
        title = title or ("Google 文件" if google_docs else "Google Drive 檔案")

    return {
        "sourceUrl": source_url,
        "canonicalUrl": canonical,
        "sourceDomain": source_domain,
        "sourceName": source_name or source_domain,
        "remoteTitle": title[:500],
        "remoteSummary": summary[:2000],
        "remoteCoverUrl": cover[:2000],
        "authorName": author_value[:300],
        "authorBio": bio_for(resolved_author_url)[:2000],
        "authorUrl": resolved_author_url,
        "authorAvatarUrl": avatar_for(resolved_author_url),
        "organizationName": organization_value[:300],
        "organizationUrl": resolved_organization_url,
        "organizationAvatarUrl": avatar_for(resolved_organization_url),
        "coverPreviewDataUrl": (
            fetch_google_docs_cover_preview(source_url)
            if google_docs
            else fetch_google_drive_file_cover_preview(source_url)
            if google_drive_file
            else ""
        ),
    }
