
import json

def test_get_settings_empty(client):
    """Test getting settings for a new user"""
    response = client.get(
        "/api/me",
        headers={"X-User-ID": "test_user_1"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test_user_1"
    assert data["settings"] == {}

def test_update_settings(client):
    """Test updating and retrieving settings"""
    user_id = "test_user_update"
    headers = {"X-User-ID": user_id}
    
    settings_payload = {
        "accent": "violet",
        "fontSize": 18,
        "markerThemes": [{"id": "theme1", "configs": []}]
    }
    
    # Update
    response = client.put(
        "/api/me",
        json={"settings": settings_payload},
        headers=headers
    )
    assert response.status_code == 200
    
    # Retrieve
    response = client.get("/api/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["settings"]["accent"] == "violet"
    assert data["settings"]["fontSize"] == 18

def test_marker_themes(client):
    """Test creating and retrieving marker themes"""
    user_id = "test_user_themes"
    headers = {"X-User-ID": user_id}
    
    # Create Theme
    theme_payload = {
        "name": "My Custom Theme",
        "configs": json.dumps([{"id": "c1", "color": "red"}]),
        "isPublic": False
    }
    
    response = client.post("/api/themes", json=theme_payload, headers=headers)
    assert response.status_code == 200
    created_theme = response.json()
    assert created_theme["name"] == "My Custom Theme"
    
    # Get Themes
    response = client.get("/api/themes", headers=headers)
    assert response.status_code == 200
    themes = response.json()
    assert len(themes) == 1
    assert themes[0]["id"] == created_theme["id"]
