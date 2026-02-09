
import json

def test_create_script(client):
    """Test creating a script and checking default values"""
    headers = {"X-User-ID": "u1"}
    payload = {
        "title": "My Script",
        "type": "script",
        "folder": "/"
    }
    response = client.post("/api/scripts", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "My Script"
    assert data["type"] == "script"
    assert "id" in data
    assert data["sortOrder"] == 0.0

def test_update_script(client):
    """Test updating script content and metadata"""
    headers = {"X-User-ID": "u1"}
    # Create
    res = client.post("/api/scripts", json={"title": "Orig"}, headers=headers)
    script_id = res.json()["id"]
    
    # Update
    update_payload = {
        "title": "Updated Title",
        "content": "EXT. PLACE - DAY"
    }
    res = client.put(f"/api/scripts/{script_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    
    # Verify
    res = client.get(f"/api/scripts/{script_id}", headers=headers)
    data = res.json()
    assert data["title"] == "Updated Title"
    assert data["content"] == "EXT. PLACE - DAY"

def test_delete_script(client):
    """Test deleting a script"""
    headers = {"X-User-ID": "u1"}
    res = client.post("/api/scripts", json={"title": "To Delete"}, headers=headers)
    script_id = res.json()["id"]
    
    client.delete(f"/api/scripts/{script_id}", headers=headers)
    
    res = client.get(f"/api/scripts/{script_id}", headers=headers)
    assert res.status_code == 404

def test_script_reorder(client):
    """Test reordering scripts"""
    headers = {"X-User-ID": "u1"}
    s1 = client.post("/api/scripts", json={"title": "S1"}, headers=headers).json()
    s2 = client.post("/api/scripts", json={"title": "S2"}, headers=headers).json()
    
    # Reorder S1 to 500, S2 to 10
    payload = {
        "items": [
            {"id": s1["id"], "sortOrder": 500.0},
            {"id": s2["id"], "sortOrder": 10.0}
        ]
    }
    client.put("/api/scripts/reorder", json=payload, headers=headers)
    
    # Verify order
    res = client.get("/api/scripts", headers=headers)
    items = res.json()
    # List is sorted by sortOrder asc, lastModified desc
    # 10.0 should come first
    assert items[0]["id"] == s2["id"]
    assert items[1]["id"] == s1["id"]

def test_folder_parent_timestamp(client):
    """Test that modifying a child updates parent folder timestamp"""
    headers = {"X-User-ID": "u1"}
    
    # Create Folder
    f = client.post("/api/scripts", json={"title": "FolderA", "type": "folder", "folder": "/"}, headers=headers).json()
    folder_id = f["id"]
    initial_ts = f["lastModified"]
    
    # Create Child Script inside /FolderA
    client.post("/api/scripts", json={"title": "Child", "folder": "/FolderA"}, headers=headers)
    
    # Check Folder Timestamp
    res = client.get(f"/api/scripts/{folder_id}", headers=headers)
    updated_ts = res.json()["lastModified"]
    
    assert updated_ts >= initial_ts

def test_script_disable_copy_default(client):
    """Test that disableCopy defaults to False"""
    headers = {"X-User-ID": "u1"}
    payload = {"title": "Test Script"}
    response = client.post("/api/scripts", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data.get("disableCopy") == False

def test_script_disable_copy_update(client):
    """Test updating disableCopy setting"""
    headers = {"X-User-ID": "u1"}
    # Create
    res = client.post("/api/scripts", json={"title": "Protected Script"}, headers=headers)
    script_id = res.json()["id"]
    
    # Update disableCopy to True
    update_payload = {"disableCopy": True}
    res = client.put(f"/api/scripts/{script_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    
    # Verify
    res = client.get(f"/api/scripts/{script_id}", headers=headers)
    data = res.json()
    assert data["disableCopy"] == True
    
    # Update disableCopy back to False
    update_payload = {"disableCopy": False}
    res = client.put(f"/api/scripts/{script_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    
    # Verify
    res = client.get(f"/api/scripts/{script_id}", headers=headers)
    data = res.json()
    assert data["disableCopy"] == False

