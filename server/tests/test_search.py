
def test_search_content(client):
    """Test searching scripts by content"""
    headers = {"X-User-ID": "u3"}
    
    client.post("/api/scripts", json={"title": "Apple", "content": "Red Fruit"}, headers=headers)
    client.post("/api/scripts", json={"title": "Banana", "content": "Yellow Fruit"}, headers=headers)
    
    # Search 'Red'
    res = client.get("/api/search?q=Red", headers=headers)
    results = res.json()
    assert len(results) == 1
    assert results[0]["title"] == "Apple"

def test_search_isolation(client):
    """Ensure users cannot search others' scripts"""
    h1 = {"X-User-ID": "u3"}
    h2 = {"X-User-ID": "u4"}
    
    client.post("/api/scripts", json={"title": "Secret", "content": "Hidden"}, headers=h1)
    
    # User 2 searches
    res = client.get("/api/search?q=Secret", headers=h2)
    results = res.json()
    assert len(results) == 0
