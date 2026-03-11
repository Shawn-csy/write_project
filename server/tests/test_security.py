
def test_theme_copy_security(client):
    u1 = {"X-User-ID": "u_sec_1"}
    u2 = {"X-User-ID": "u_sec_2"}
    
    # U1 creates private theme
    res = client.post("/api/themes", json={"name": "Private", "configs": "[]", "isPublic": False}, headers=u1)
    theme_id = res.json()["id"]
    
    # U2 tries to copy
    res = client.post(f"/api/themes/{theme_id}/copy", headers=u2)
    assert res.status_code == 403
    
    # U1 makes it public
    client.put(f"/api/themes/{theme_id}", json={"isPublic": True}, headers=u1)
    
    # U2 copies again
    res = client.post(f"/api/themes/{theme_id}/copy", headers=u2)
    assert res.status_code == 200

def test_script_access_control(client):
    u1 = {"X-User-ID": "u_sec_a"}
    u2 = {"X-User-ID": "u_sec_b"}
    
    # U1 creates script
    res = client.post("/api/scripts", json={"title": "Private"}, headers=u1)
    sid = res.json()["id"]
    
    # U2 tries to update
    res = client.put(f"/api/scripts/{sid}", json={"title": "Hacked"}, headers=u2)
    assert res.status_code == 404 # Implementation hides others' data
    
    # U2 tries to delete
    res = client.delete(f"/api/scripts/{sid}", headers=u2)
    assert res.status_code == 404


def test_cross_owner_tag_attach_is_forbidden(client):
    owner = {"X-User-ID": "u_tag_owner"}
    attacker = {"X-User-ID": "u_tag_attacker"}

    script_res = client.post("/api/scripts", json={"title": "Victim Script"}, headers=owner)
    assert script_res.status_code == 200
    script_id = script_res.json()["id"]

    tag_res = client.post("/api/tags", json={"name": "BadTag", "color": "red"}, headers=attacker)
    assert tag_res.status_code == 200
    tag_id = tag_res.json()["id"]

    attach_res = client.post(f"/api/scripts/{script_id}/tags", json={"tagId": tag_id}, headers=attacker)
    assert attach_res.status_code == 403
