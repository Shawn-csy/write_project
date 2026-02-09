
import json

def test_public_script_author_settings(client):
    """Test validity of author settings in public scripts"""
    author_id = "author_1"
    headers = {"X-User-ID": author_id}
    
    # 1. Create Theme
    theme_payload = {
        "name": "Public Theme",
        "configs": json.dumps([{"id": "marker1", "color": "#FF0000"}]),
        "isPublic": True
    }
    res = client.post("/api/themes", json=theme_payload, headers=headers)
    theme_id = res.json()["id"]
    
    # 2. Create Script with that theme
    script_payload = {
        "title": "My Public Script",
        "content": "INT. TEST",
        "isPublic": True,
        "markerThemeId": theme_id
    }
    res = client.post("/api/scripts", json=script_payload, headers=headers)
    script_id = res.json()["id"]
    
    # 3. Fetch as Anonymous (or other user)
    # Note: get_script filters by ownerId usually, so we test the PUBLIC endpoint
    # Assuming crud.get_public_script logic or similar is exposed via /api/public-scripts/{id}
    # Wait, main.py has @app.get("/api/public-scripts/{script_id}")
    
    res = client.get(f"/api/public-scripts/{script_id}")
    assert res.status_code == 200
    data = res.json()
    
    # 4. Verify markerThemeId matches
    assert data["markerThemeId"] == theme_id
    # Note: The 'markerTheme' relationship might not be eagerly loaded depending on SQLAlchemy model
    # If standard fetch doesn't include it, frontend does separate fetch? 
    # Current frontend logic checks script.markerThemeId and fetches from /api/themes/public if needed.
    
def test_public_themes_list(client):
    """Test retrieving public themes"""
    author_id = "author_2"
    headers = {"X-User-ID": author_id}
    
    # Create Public Theme
    client.post("/api/themes", json={
        "name": "Public One",
        "configs": "[]",
        "isPublic": True
    }, headers=headers)
    
    # Create Private Theme
    client.post("/api/themes", json={
        "name": "Private One",
        "configs": "[]",
        "isPublic": False
    }, headers=headers)
    
    # Fetch Public Themes
    res = client.get("/api/themes/public")
    assert res.status_code == 200
    themes = res.json()
    
    names = [t["name"] for t in themes]
    assert "Public One" in names
    assert "Private One" not in names
