import pytest
import anyio
from fastapi import HTTPException
from unittest.mock import patch, MagicMock
from dependencies import get_current_user_id, is_admin_user_id

# Mock for firebase_admin to avoid hitting actual Firebase during unit tests
@pytest.fixture
def mock_firebase_auth():
    with patch("dependencies._init_firebase_auth") as mock_init:
        mock_auth = MagicMock()
        mock_init.return_value = mock_auth
        yield mock_auth

def test_get_current_user_id_missing_token():
    async def run_test():
        with pytest.raises(HTTPException) as exc:
            await get_current_user_id(authorization=None, x_user_id=None)
        assert exc.value.status_code == 401
        assert "Missing Authorization token" in exc.value.detail
    anyio.run(run_test)

def test_get_current_user_id_invalid_bearer_format():
    async def run_test():
        with pytest.raises(HTTPException) as exc:
            await get_current_user_id(authorization="Basic dGVzdDp0ZXN0")
        assert exc.value.status_code == 401
        assert "Invalid Authorization header" in exc.value.detail
    anyio.run(run_test)

def test_get_current_user_id_empty_token():
    async def run_test():
        with pytest.raises(HTTPException) as exc:
            await get_current_user_id(authorization="Bearer ")
        assert exc.value.status_code == 401
        assert "Missing bearer token" in exc.value.detail
    anyio.run(run_test)

def test_get_current_user_id_invalid_payload(mock_firebase_auth):
    async def run_test():
        mock_firebase_auth.verify_id_token.return_value = {}
        with pytest.raises(HTTPException) as exc:
            await get_current_user_id(authorization="Bearer fake-token")
        assert exc.value.status_code == 401
        assert "Invalid token payload" in exc.value.detail
        mock_firebase_auth.verify_id_token.assert_called_once_with("fake-token", check_revoked=True)
    anyio.run(run_test)

def test_get_current_user_id_valid_token(mock_firebase_auth):
    async def run_test():
        mock_firebase_auth.verify_id_token.return_value = {"uid": "user-123"}
        user_id = await get_current_user_id(authorization="Bearer valid-token")
        assert user_id == "user-123"
    anyio.run(run_test)

def test_get_current_user_id_x_user_id_fallback():
    async def run_test():
        with patch("dependencies.ALLOW_X_USER_ID", True), patch.dict("os.environ", {"ENVIRONMENT": "development"}):
            user_id = await get_current_user_id(authorization=None, x_user_id="fallback-user-1")
            assert user_id == "fallback-user-1"
            
        with patch("dependencies.ALLOW_X_USER_ID", False), patch.dict("os.environ", {"ENVIRONMENT": "development"}):
            with pytest.raises(HTTPException) as exc:
                await get_current_user_id(authorization=None, x_user_id="fallback-user-1")
            assert exc.value.status_code == 401
            assert "Missing Authorization token" in exc.value.detail
    anyio.run(run_test)

def test_get_current_user_id_x_user_id_blocked_in_production(monkeypatch):
    async def run_test():
        monkeypatch.setenv("ENVIRONMENT", "production")
        with patch("dependencies.ALLOW_X_USER_ID", True):
            with pytest.raises(HTTPException) as exc:
                await get_current_user_id(authorization=None, x_user_id="fallback-user-1")
            assert exc.value.status_code == 401
            assert "Missing Authorization token" in exc.value.detail
    anyio.run(run_test)

def test_is_admin_user_id():
    # Testing matching admin logic
    with patch("dependencies.ADMIN_USER_IDS", {"admin-user-1", "admin-user-2"}):
        assert is_admin_user_id("admin-user-1") is True
        assert is_admin_user_id("admin-user-2") is True
        assert is_admin_user_id("regular-user") is False
