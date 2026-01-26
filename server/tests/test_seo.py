
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
