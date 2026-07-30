def test_liveness_does_not_require_auth_or_database(client):
    response = client.get("/api/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "backend"}
    assert response.headers["cache-control"] == "no-store"


def test_readiness_checks_database(client):
    for path in ("/api/health", "/api/health/ready"):
        response = client.get(path)

        assert response.status_code == 200
        assert response.json() == {
            "status": "ready",
            "service": "backend",
            "checks": {"database": "ok", "schema": "ok"},
        }
        assert response.headers["cache-control"] == "no-store"


def test_readiness_returns_503_when_database_fails(client, db_session, monkeypatch):
    def fail_query(*_args, **_kwargs):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(db_session, "execute", fail_query)

    response = client.get("/api/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "service": "backend",
        "checks": {"database": "failed"},
    }
    assert response.headers["cache-control"] == "no-store"
    assert "database unavailable" not in response.text


def test_readiness_returns_503_when_schema_is_not_ready(client, db_session, monkeypatch):
    original_execute = db_session.execute
    call_count = 0

    def fail_schema_check(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("missing migration")
        return original_execute(*args, **kwargs)

    monkeypatch.setattr(db_session, "execute", fail_schema_check)

    response = client.get("/api/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "service": "backend",
        "checks": {"database": "ok", "schema": "failed"},
    }
    assert "missing migration" not in response.text


def test_auth_health_remains_an_authenticated_smoke_test(client):
    missing_auth = client.get("/api/health/auth")
    assert missing_auth.status_code == 401

    authenticated = client.get(
        "/api/health/auth",
        headers={"X-User-ID": "health-test-user"},
    )
    assert authenticated.status_code == 200
    assert authenticated.json() == {
        "ok": True,
        "status": "ok",
        "service": "auth",
        "uid": "health-test-user",
    }
    assert authenticated.headers["cache-control"] == "no-store"
