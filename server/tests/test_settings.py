
import json
import time

from models import OrganizationMembership, User

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


def test_delete_missing_theme_returns_404(client):
    user_id = "test_user_theme_delete_missing"
    headers = {"X-User-ID": user_id}
    response = client.delete("/api/themes/no-such-theme", headers=headers)
    assert response.status_code == 404


def test_get_settings_invalid_json_falls_back_to_empty_and_sets_primary_org(client, db_session):
    now = int(time.time() * 1000)
    db_session.add(
        User(
            id="settings_invalid_json_user",
            handle="settings_invalid_json_user",
            settings="{not-json",
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.add(
        OrganizationMembership(
            id="membership-1",
            userId="settings_invalid_json_user",
            orgId="org-primary",
            role="member",
            createdAt=now,
            updatedAt=now,
        )
    )
    db_session.commit()

    response = client.get("/api/me", headers={"X-User-ID": "settings_invalid_json_user"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["settings"] == {}
    assert payload["organizationIds"] == ["org-primary"]
    assert payload["organizationId"] == "org-primary"


def test_get_settings_admin_user_returns_is_admin_true(client):
    response = client.get("/api/me", headers={"X-User-ID": "admin-owner"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "admin-owner"
    assert payload["isAdmin"] is True


def test_update_settings_duplicate_handle_returns_409(client, db_session):
    now = int(time.time() * 1000)
    db_session.add(
        User(
            id="owner_a",
            handle="taken_handle",
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.add(
        User(
            id="owner_b",
            handle="free_handle",
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.commit()

    response = client.put(
        "/api/me",
        json={"handle": "taken_handle"},
        headers={"X-User-ID": "owner_b"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Handle already taken"


def test_read_me_does_not_dirty_user_settings_before_other_writes(client, db_session):
    now = int(time.time() * 1000)
    db_session.add(
        User(
            id="settings_flush_user",
            handle="settings_flush_user",
            settings='{"accent":"blue"}',
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.commit()

    headers = {"X-User-ID": "settings_flush_user"}
    me_res = client.get("/api/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["settings"]["accent"] == "blue"

    # Regression: this used to fail with sqlite binding error because /api/me
    # mutated ORM user.settings from JSON string to dict in-session.
    create_res = client.post("/api/scripts", json={"title": "AfterMe"}, headers=headers)
    assert create_res.status_code == 200


def test_update_settings_cannot_set_email(client, db_session):
    """權限提升防護：PUT /api/me 不得改寫 users.email。

    is_admin_user() 以 users.email 比對 ADMIN_USER_EMAILS 授予管理權限，
    若 email 可由客戶端寫入，任何已登入使用者只要送出管理者信箱即可提權。
    """
    import time

    from models import User

    now = int(time.time() * 1000)
    db_session.add(
        User(id="attacker", email="attacker@example.com", createdAt=now, lastLogin=now)
    )
    db_session.commit()

    response = client.put(
        "/api/me",
        json={"email": "admin@example.com", "displayName": "attacker"},
        headers={"X-User-ID": "attacker"},
    )

    assert response.status_code == 200
    db_session.expire_all()
    stored = db_session.query(User).filter(User.id == "attacker").first()
    assert stored.email == "attacker@example.com", "email 不得被客戶端改寫"
    assert stored.displayName == "attacker", "其他欄位仍應正常更新"


def test_update_settings_cannot_set_is_admin(client, db_session):
    """isAdmin 同樣不接受客戶端提供（目前無對應資料表欄位，仍明確擋下）。"""
    import time

    from models import User

    now = int(time.time() * 1000)
    db_session.add(User(id="attacker2", createdAt=now, lastLogin=now))
    db_session.commit()

    response = client.put(
        "/api/me",
        json={"isAdmin": True, "displayName": "x"},
        headers={"X-User-ID": "attacker2"},
    )

    assert response.status_code == 200
    assert response.json().get("isAdmin") is False


def _fake_firebase(monkeypatch, claims):
    import dependencies

    class _FakeAuth:
        def verify_id_token(self, token, check_revoked=False):
            return claims

    monkeypatch.setattr(dependencies, "_init_firebase_auth", lambda: _FakeAuth())


def test_email_is_written_from_verified_token(client, db_session, monkeypatch):
    """email 由後端從已驗證的 token 寫入。

    前端 AuthContext.syncUserProfile 登入時會送 email，這是 users.email 的
    實際來源。改為信任 token 而非 request body 後，功能必須維持。
    """
    from models import User

    _fake_firebase(monkeypatch, {"uid": "tokenuser", "email": "Real@Example.com", "email_verified": True})

    response = client.put(
        "/api/me",
        json={"displayName": "n", "email": "spoofed-admin@example.com"},
        headers={"Authorization": "Bearer valid"},
    )

    assert response.status_code == 200
    db_session.expire_all()
    stored = db_session.query(User).filter(User.id == "tokenuser").first()
    assert stored.email == "real@example.com", "應採用 token 的 email 並正規化為小寫"


def test_unverified_token_email_is_not_written(client, db_session, monkeypatch):
    """未驗證的 email 不可信 —— 攻擊者能以任意 email 註冊，
    若採信即可冒充 ADMIN_USER_EMAILS 中的管理者。"""
    from models import User

    _fake_firebase(
        monkeypatch,
        {"uid": "unverified", "email": "admin@example.com", "email_verified": False},
    )

    response = client.put(
        "/api/me", json={"displayName": "n"}, headers={"Authorization": "Bearer valid"}
    )

    assert response.status_code == 200
    db_session.expire_all()
    stored = db_session.query(User).filter(User.id == "unverified").first()
    assert not stored.email, "未驗證的 email 不得寫入"
