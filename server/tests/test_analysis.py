
from fastapi.testclient import TestClient

def test_analyze_script(client):
    headers = {"X-User-ID": "u_analysis"}
    
    # 1. Create Script
    res = client.post("/api/scripts", json={"title": "Analysis Test", "content": "INT. ROOM - DAY\n\nJOHN\nHello."}, headers=headers)
    assert res.status_code == 200
    script_id = res.json()["id"]
    
    # 2. Analyze
    res = client.get(f"/api/analysis/script/{script_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    # 3. Verify Stats
    assert data["counts"]["scenes"] == 1
    assert data["counts"]["dialogueLines"] == 1
    assert data["characterStats"][0]["name"] == "JOHN"
    assert data["durationMinutes"] > 0

def test_analyze_script_with_custom_theme(client, db_session):
    headers = {"X-User-ID": "u_analysis_custom"}
    
    # 1. Create Theme
    import json
    configs = [
        {"id": "note", "name": "Note", "start": "[[", "end": "]]", "isBlock": False, "matchMode": "enclosure"},
        {"id": "scream", "name": "Scream", "start": "!", "isBlock": False, "matchMode": "prefix"}
    ]
    # We need to manually insert theme or use API if available. 
    # Let's insert via models for speed/reliability in test
    from models import MarkerTheme, User
    
    # Create User first (for FK)
    user = User(id="u_analysis_custom", handle="u_custom", displayName="Custom User")
    db_session.add(user)
    
    theme = MarkerTheme(
        id="theme_custom", 
        ownerId="u_analysis_custom", 
        name="Custom Rules", 
        configs=json.dumps(configs)
    )
    db_session.add(theme)
    db_session.commit()
    
    # 2. Create Script using Theme
    res = client.post("/api/scripts", json={
        "title": "Custom Test", 
        "content": "INT. LAB - DAY\n\nSCIENTIST\nLook at this! [[Secret Data]]\n\n! Watch out!", 
        "markerThemeId": "theme_custom"
    }, headers=headers)
    assert res.status_code == 200
    script_id = res.json()["id"]
    
    # 3. Analyze
    res = client.get(f"/api/analysis/script/{script_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    # 4. Verify Custom Layers
    # "Note" layer should contain "Secret Data"
    assert "Note" in data["customLayers"]
    assert "Secret Data" in data["customLayers"]["Note"]
    
    # "Scream" layer should contain "Watch out!"
    assert "Scream" in data["customLayers"]
    assert "Watch out!" in data["customLayers"]["Scream"]
    
    # Verify it didn't count markers as dialogue or action incorrectly? 
    # Current implementation: 
    # - Inline "[[Secret Data]]" is ALSO part of dialogue line (standard Fountain doesn't strip automatically unless told so).
    # - Prefix "! Watch out!" handles the line. If handled, it skips standard parsing.
    # So "! Watch out!" should NOT be action.
    assert "Watch out!" not in data["sentences"]["action"]

    # 5. Verify Fixed Duration
    # Since we didn't set fixedDuration in configs above, it should be 0 impact.
    # Let's add a NEW test or update this one? 
    # Let's add test_analyze_script_with_fixed_duration separate function.

def test_analyze_script_with_fixed_duration(client, db_session):
    headers = {"X-User-ID": "u_analysis_duration"}
    
    # 1. Create Theme with Duration
    import json
    # A "Pause" marker adds 10 seconds.
    configs = [
        {"id": "pause", "name": "Pause", "start": "[[", "end": "]]", "isBlock": False, "matchMode": "enclosure", "fixedDuration": 10}
    ]
    
    from models import MarkerTheme, User
    user = User(id="u_analysis_duration", handle="u_duration", displayName="Duration User")
    db_session.add(user)
    
    theme = MarkerTheme(
        id="theme_duration", 
        ownerId="u_analysis_duration", 
        name="Duration Rules", 
        configs=json.dumps(configs)
    )
    db_session.add(theme)
    db_session.commit()
    
    # 2. Create Script
    # One scene, One character line "Hi" (2 chars).
    # One Pause Marker [[Pause]] (should usually handle "Pause" content).
    res = client.post("/api/scripts", json={
        "title": "Duration Test", 
        "content": "INT. TEST - DAY\n\nBOB\nHi. [[Pause]]", 
        "markerThemeId": "theme_duration"
    }, headers=headers)
    assert res.status_code == 200
    script_id = res.json()["id"]
    
    # 3. Analyze
    res = client.get(f"/api/analysis/script/{script_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    # 4. Verify
    # Dialogue: "Hi." (3 chars) -> 3 / 200 = 0.015 min
    # Pause: 10 seconds -> 10 / 60 = 0.1666 min
    # Total: ~0.1816 min
    
    expected_pure = (3 / 200) + (10 / 60)
    assert abs(data["durationMinutes"] - expected_pure) < 0.001
    
    # Verify custom duration field exists (optional debugging)
    # assert data["customDurationSeconds"] == 10 # Only if we expose it in API response

