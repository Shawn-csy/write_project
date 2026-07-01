"""
Phase 2 public write hardening tests.

Covers:
- POST /api/scripts/{id}/view: private script 404, counter not incremented, decorator present
- POST /api/public-scripts/{id}/like: rate limit decorator present
- POST /api/public-terms-acceptances: rate limit decorator present

Rate-limit 429 integration tests are included but skipped when slowapi is not
wired up in the test runner (RATE_LIMIT_ENABLED=False or middleware absent).
To run 429 tests in CI, ensure slowapi is installed and the test runner does not
bypass SlowAPIMiddleware.
"""

import time
import inspect
import pytest
from models import Script, User
from rate_limit import RATE_LIMIT_ENABLED


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_script(db_session, *, script_id, is_public):
    now = int(time.time() * 1000)
    user = User(id=f"owner-{script_id}", handle=f"owner-{script_id}")
    script = Script(
        id=script_id,
        ownerId=f"owner-{script_id}",
        title=script_id,
        content="INT. ROOM - DAY",
        folder="/",
        type="script",
        isPublic=1 if is_public else 0,
        views=0,
        likes=0,
        createdAt=now,
        lastModified=now,
    )
    db_session.add_all([user, script])
    db_session.commit()
    return script_id


@pytest.fixture()
def public_script(db_session):
    return _make_script(db_session, script_id="rl-pub-script", is_public=True)


@pytest.fixture()
def private_script(db_session):
    return _make_script(db_session, script_id="rl-priv-script", is_public=False)


def _terms_payload(config, script_id=None, visitor_id="v-test"):
    required_ids = [item["id"] for item in (config.get("requiredChecks") or [])]
    payload = {
        "termsVersion": config["version"],
        "visitorId": visitor_id,
        "acceptedChecks": required_ids,
    }
    if script_id:
        payload["scriptId"] = script_id
    return payload


# ---------------------------------------------------------------------------
# Rate-limit decorator presence — verified via source inspection
# These fail immediately if the decorator was accidentally removed.
# ---------------------------------------------------------------------------

def _file_has_pattern_before(filepath: str, func_name: str, pattern: str) -> bool:
    """Return True if `pattern` appears on a line directly before `def func_name` in file."""
    import pathlib
    lines = pathlib.Path(filepath).read_text().splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith(f"def {func_name}("):
            # Check the 3 lines above for the pattern.
            preceding = lines[max(0, i - 3):i]
            return any(pattern in l for l in preceding)
    return False


def test_view_endpoint_has_rate_limit_decorator():
    import routers.scripts as _m
    path = inspect.getfile(_m)
    assert _file_has_pattern_before(path, "increment_view", "@limiter.limit("), \
        "increment_view missing @limiter.limit decorator"


def test_like_endpoint_has_rate_limit_decorator():
    import routers.public as _m
    path = inspect.getfile(_m)
    assert _file_has_pattern_before(path, "public_toggle_like", "@limiter.limit("), \
        "public_toggle_like missing @limiter.limit decorator"


def test_terms_endpoint_has_rate_limit_decorator():
    import routers.public as _m
    path = inspect.getfile(_m)
    assert _file_has_pattern_before(path, "create_public_terms_acceptance", "@limiter.limit("), \
        "create_public_terms_acceptance missing @limiter.limit decorator"


# ---------------------------------------------------------------------------
# Rate-limit enabled guard
# ---------------------------------------------------------------------------

def test_rate_limit_enabled():
    """Asserts slowapi is installed and active. Fails if wiring is broken."""
    assert RATE_LIMIT_ENABLED, (
        "RATE_LIMIT_ENABLED=False: slowapi not installed or import failed. "
        "Rate limit decorators are present but have no effect. "
        "Install slowapi>=0.1.9 to fix."
    )


# ---------------------------------------------------------------------------
# folder-inherited visibility — regression tests for shared predicate
#
# A script with isPublic=0 inside a public folder must be treated as public
# by view, like, like-status, and stats endpoints — not blocked by isPublic==1 check.
# If any of these endpoints regress back to `isPublic == 1`, these tests fail.
# ---------------------------------------------------------------------------

def _seed_folder_inherited_script(db_session):
    """Seed a script with isPublic=0 inside a public folder (isPublic=1 folder)."""
    now = int(time.time() * 1000)
    owner_id = "fi-owner"
    user = User(id=owner_id, handle=owner_id)
    pub_folder = Script(
        id="fi-folder",
        ownerId=owner_id,
        title="fi-folder",
        folder="/",
        type="folder",
        isPublic=1,
        createdAt=now,
        lastModified=now,
    )
    child = Script(
        id="fi-child",
        ownerId=owner_id,
        title="fi-child",
        content="INT. ROOM - DAY",
        folder="/fi-folder",
        type="script",
        isPublic=0,  # explicitly NOT public — visibility comes from parent folder
        views=0,
        likes=0,
        createdAt=now,
        lastModified=now,
    )
    db_session.add_all([user, pub_folder, child])
    db_session.commit()
    return "fi-child"


def test_folder_inherited_view_counts(client, db_session):
    script_id = _seed_folder_inherited_script(db_session)
    res = client.post(f"/api/scripts/{script_id}/view", headers={"X-Forwarded-For": "10.20.0.1"})
    assert res.status_code == 200, f"folder-inherited script view returned {res.status_code}"


def test_folder_inherited_like_works(client, db_session):
    script_id = _seed_folder_inherited_script(db_session)
    res = client.post(
        f"/api/public-scripts/{script_id}/like",
        json={"visitorId": "fi-visitor"},
        headers={"X-Forwarded-For": "10.20.0.2"},
    )
    assert res.status_code == 200, f"folder-inherited script like returned {res.status_code}"
    assert "liked" in res.json()


def test_folder_inherited_like_status_works(client, db_session):
    script_id = _seed_folder_inherited_script(db_session)
    res = client.get(f"/api/public-scripts/{script_id}/like-status?visitorId=fi-visitor")
    assert res.status_code == 200, f"folder-inherited like-status returned {res.status_code}"


def test_folder_inherited_stats_works(client, db_session):
    script_id = _seed_folder_inherited_script(db_session)
    res = client.get(f"/api/public-scripts/{script_id}/stats")
    assert res.status_code == 200, f"folder-inherited stats returned {res.status_code}"
    data = res.json()
    assert "views" in data and "likes" in data


# ---------------------------------------------------------------------------
# view — private script must 404 and not increment counter
# ---------------------------------------------------------------------------

def test_view_private_script_returns_404(client, private_script):
    res = client.post(
        f"/api/scripts/{private_script}/view",
        headers={"X-Forwarded-For": "10.0.1.1"},
    )
    assert res.status_code == 404


def test_view_private_script_counter_not_incremented(client, db_session, private_script):
    from models import Script as ScriptModel
    client.post(
        f"/api/scripts/{private_script}/view",
        headers={"X-Forwarded-For": "10.0.1.2"},
    )
    script = db_session.query(ScriptModel).filter(ScriptModel.id == private_script).first()
    assert (script.views or 0) == 0


def test_view_public_script_increments_counter(client, db_session, public_script):
    from models import Script as ScriptModel
    res = client.post(
        f"/api/scripts/{public_script}/view",
        headers={"X-Forwarded-For": "10.0.2.1"},
    )
    assert res.status_code == 200
    script = db_session.query(ScriptModel).filter(ScriptModel.id == public_script).first()
    assert (script.views or 0) == 1


# ---------------------------------------------------------------------------
# Rate-limit 429 integration — only run when slowapi middleware is active.
#
# These tests use a dedicated TestClient with raise_server_exceptions=False
# so SlowAPIMiddleware can return 429 without the exception propagating to pytest.
# Each test uses a unique IP to avoid cross-test counter bleed.
# ---------------------------------------------------------------------------

requires_rate_limit = pytest.mark.skipif(
    not RATE_LIMIT_ENABLED,
    reason="slowapi not installed; rate-limit 429 tests skipped",
)


@requires_rate_limit
def test_view_rate_limit_429(db_session, public_script):
    from fastapi.testclient import TestClient
    from main import app
    from dependencies import get_db
    from database import get_db as database_get_db

    def override():
        yield db_session

    app.dependency_overrides[get_db] = override
    app.dependency_overrides[database_get_db] = override
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            ip = "10.11.0.1"
            headers = {"X-Forwarded-For": ip}
            for _ in range(10):
                r = c.post(f"/api/scripts/{public_script}/view", headers=headers)
                assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            r = c.post(f"/api/scripts/{public_script}/view", headers=headers)
            assert r.status_code == 429, f"Expected 429 on 11th request, got {r.status_code}"
    finally:
        app.dependency_overrides.clear()


@requires_rate_limit
def test_like_rate_limit_429(db_session, public_script):
    from fastapi.testclient import TestClient
    from main import app
    from dependencies import get_db
    from database import get_db as database_get_db

    def override():
        yield db_session

    app.dependency_overrides[get_db] = override
    app.dependency_overrides[database_get_db] = override
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            ip = "10.12.0.1"
            headers = {"X-Forwarded-For": ip}
            for i in range(30):
                r = c.post(
                    f"/api/public-scripts/{public_script}/like",
                    json={"visitorId": f"v-{i}"},
                    headers=headers,
                )
                assert r.status_code == 200, f"Request {i}: expected 200, got {r.status_code}"
            r = c.post(
                f"/api/public-scripts/{public_script}/like",
                json={"visitorId": "v-overflow"},
                headers=headers,
            )
            assert r.status_code == 429
    finally:
        app.dependency_overrides.clear()


@requires_rate_limit
def test_terms_acceptance_rate_limit_429(db_session, public_script):
    from fastapi.testclient import TestClient
    from main import app
    from dependencies import get_db
    from database import get_db as database_get_db

    def override():
        yield db_session

    app.dependency_overrides[get_db] = override
    app.dependency_overrides[database_get_db] = override
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            ip = "10.13.0.1"
            headers = {"X-Forwarded-For": ip}
            config = c.get("/api/public-terms-config").json()

            for i in range(5):
                r = c.post(
                    "/api/public-terms-acceptances",
                    json=_terms_payload(config, script_id=public_script, visitor_id=f"v-terms-{i}"),
                    headers=headers,
                )
                assert r.status_code == 200, f"Request {i}: expected 200, got {r.status_code}"

            r = c.post(
                "/api/public-terms-acceptances",
                json=_terms_payload(config, script_id=public_script, visitor_id="v-terms-overflow"),
                headers=headers,
            )
            assert r.status_code == 429
    finally:
        app.dependency_overrides.clear()
