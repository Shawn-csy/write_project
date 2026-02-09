
def test_tag_crud(client):
    """Test creating, deleting and listing tags"""
    headers = {"X-User-ID": "u2"}
    
    # Create
    res = client.post("/api/tags", json={"name": "Drama", "color": "red"}, headers=headers)
    assert res.status_code == 200
    tag = res.json()
    assert tag["name"] == "Drama"
    tag_id = tag["id"]
    
    # List
    res = client.get("/api/tags", headers=headers)
    tags = res.json()
    assert len(tags) == 1
    assert tags[0]["id"] == tag_id
    
    # Delete
    client.delete(f"/api/tags/{tag_id}", headers=headers)
    res = client.get("/api/tags", headers=headers)
    assert len(res.json()) == 0

def test_tag_assignment(client):
    """Test adding/removing tags to a script"""
    headers = {"X-User-ID": "u2"}
    
    # Create Script & Tag
    sid = client.post("/api/scripts", json={"title": "Tagged Script"}, headers=headers).json()["id"]
    tid = client.post("/api/tags", json={"name": "SciFi", "color": "blue"}, headers=headers).json()["id"]
    
    # Attach
    client.post(f"/api/scripts/{sid}/tags", json={"tagId": tid}, headers=headers)
    
    # Verify (Need endpoint or check script.tags if eager loaded)
    # The current API doesn't eagerly load tags in get_script usually unless specified.
    # Let's check crud.get_script implementation in `main.py` -> `models.py`.
    # Based on models, Script has `tags = relationship("Tag", secondary=script_tags, back_populates="scripts")`
    # However, `get_script` returns pydantic `Script` model.
    # If pydantic model includes tags, they will show up.
    # schemas.Script has `tags: List[Tag] = []`
    
    res = client.get(f"/api/scripts/{sid}", headers=headers)
    s_data = res.json()
    assert len(s_data["tags"]) == 1
    assert s_data["tags"][0]["id"] == tid
    
    # Detach
    client.delete(f"/api/scripts/{sid}/tags/{tid}", headers=headers)
    res = client.get(f"/api/scripts/{sid}", headers=headers)
    assert len(res.json()["tags"]) == 0
