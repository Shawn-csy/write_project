
import os
from unittest.mock import patch, mock_open

def test_seo_tags(client):
    # Mock script
    headers = {"X-User-ID": "u_seo"}
    res = client.post("/api/scripts", json={"title": "SEO Script", "content": "Great content here", "isPublic": True}, headers=headers)
    script_id = res.json()["id"]
    
    # Mock template content
    mock_html = """<html><head>
    <title>Screenplay Reader</title>
    <meta property="og:title" content="Screenplay Reader" />
    <meta property="og:description" content="Default Desc" />
    <meta name="description" content="線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。" />
    </head><body></body></html>"""
    
    # We patch os.path.exists to return True when checking for index.html
    # And mock open to return our fake HTML
    
    with patch("os.path.exists", return_value=True):
        with patch("builtins.open", mock_open(read_data=mock_html)):
            response = client.get(f"/read/{script_id}")
            assert response.status_code == 200
            content = response.text
            
            assert "<title>SEO Script｜Screenplay Reader</title>" in content
            assert 'content="SEO Script"' in content # og:title
            assert 'content="Great content here..."' in content # description


def test_security_headers_csp_is_restricted(client):
    response = client.get("/api/public-terms-config")
    assert response.status_code == 200
    csp = response.headers.get("content-security-policy", "")
    assert "default-src 'self'" in csp
    assert "'unsafe-eval'" not in csp
    assert "default-src *" not in csp


def test_spa_read_markdown_error_returns_500(client, db_session, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("forced query failure")

    monkeypatch.setattr(db_session, "query", boom)
    response = client.get("/read/any/extra", headers={"Accept": "text/markdown"})
    assert response.status_code == 500
    assert response.text == "Internal Server Error"


def test_seo_structured_data_escapes_script_breakout(client):
    from services.seo import inject_structured_data

    html = "<html><head></head><body></body></html>"
    payload = {"name": '</script><script>alert("xss")</script>'}
    body = inject_structured_data(html, payload)

    assert '</script><script>alert("xss")</script>' not in body
    assert "\\u003c/script\\u003e\\u003cscript\\u003ealert" in body
