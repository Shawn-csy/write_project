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


def test_integrity_is_skipped_on_sqlite_and_reports_ok(client):
    """規劃器提示是 Postgres 專屬；SQLite 測試環境應回報 skipped 而非誤報異常。"""
    import routers.health as health_router

    health_router._integrity_cache = None
    response = client.get("/api/health/integrity")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "skipped"
    assert body["checks"]["scripts"]["status"] == "skipped"


def test_integrity_returns_503_when_index_and_heap_disagree(client, monkeypatch):
    """索引與 heap 筆數不一致必須回 503，讓外部 status 監測抓得到。

    這正是 2026-08-17 事故最早可觀察到的訊號，當時無人監看，三天後才被發現。
    """
    import routers.health as health_router

    health_router._integrity_cache = None
    monkeypatch.setattr(
        health_router,
        "_scripts_integrity",
        lambda db: (
            {"status": "degraded", "heapRows": 84, "indexRows": 69, "duplicateIds": 2},
            False,
        ),
    )

    response = client.get("/api/health/integrity")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["scripts"]["heapRows"] == 84
    assert body["checks"]["scripts"]["indexRows"] == 69


def test_integrity_does_not_affect_readiness(client, monkeypatch):
    """索引損壞不可讓 /ready 失敗 —— 容器 healthcheck 會據此重啟，
    但重啟修不好索引，只會讓整站進入重啟迴圈。"""
    import routers.health as health_router

    health_router._integrity_cache = None
    monkeypatch.setattr(
        health_router,
        "_scripts_integrity",
        lambda db: ({"status": "degraded", "heapRows": 84, "indexRows": 69, "duplicateIds": 2}, False),
    )

    assert client.get("/api/health/integrity").status_code == 503
    assert client.get("/api/health/ready").status_code == 200


def test_integrity_result_is_cached(client, monkeypatch):
    """公開端點會跑全表掃描，必須有 TTL 快取避免被輪詢放大成 DB 負載。"""
    import routers.health as health_router

    health_router._integrity_cache = None
    calls = {"n": 0}

    def counting_check(db):
        calls["n"] += 1
        return {"status": "ok", "heapRows": 1, "indexRows": 1, "duplicateIds": 0}, True

    monkeypatch.setattr(health_router, "_scripts_integrity", counting_check)

    for _ in range(5):
        assert client.get("/api/health/integrity").status_code == 200

    assert calls["n"] == 1
