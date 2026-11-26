from services import external_public_script_metadata as meta


def test_google_docs_cover_preview_falls_back_to_thumbnail_on_pdf_error(monkeypatch):
    calls = []

    def fake_fetch(url, **kwargs):
        calls.append(url)
        if "export?format=pdf" in url:
            raise meta.ExternalMetadataError("401 restricted download")
        return url, b"\x89PNG\r\n\x1a\nfake-png-bytes"

    monkeypatch.setattr(meta, "_fetch_url_bytes", fake_fetch)

    result = meta.fetch_google_docs_cover_preview(
        "https://docs.google.com/document/d/1LilNJJQ1X4cQVxGavhG_y-XJbyld1Tv9Gm/edit"
    )

    assert len(calls) == 2
    assert calls[0].endswith("/export?format=pdf")
    assert calls[1] == "https://lh3.googleusercontent.com/d/1LilNJJQ1X4cQVxGavhG_y-XJbyld1Tv9Gm=w800"
    assert result.startswith("data:image/png;base64,")
