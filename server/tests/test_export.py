
import io
import zipfile

def test_export_all(client):
    headers = {"X-User-ID": "u_export"}
    # Create some scripts
    client.post("/api/scripts", json={"title": "Script1", "content": "Content1"}, headers=headers)
    client.post("/api/scripts", json={"title": "Script2", "content": "Content2", "folder": "/FolderA"}, headers=headers)
    
    response = client.get("/api/export/all", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    
    # Verify zip content
    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        names = z.namelist()
        assert "Script1.fountain" in names
        assert "FolderA/Script2.fountain" in names
        
        s1 = z.read("Script1.fountain").decode("utf-8")
        assert s1 == "Content1"
