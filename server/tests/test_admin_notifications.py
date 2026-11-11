from models import PublicAudioWorkSubmission
from routers import public as public_router
from routers import resource_profiles as resource_profiles_router
from services import admin_notifications
from services.admin_notifications import build_approval_message, notify_approval_request


def _configure_smtp(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.test")
    monkeypatch.setenv("SMTP_PORT", "2525")
    monkeypatch.setenv("SMTP_USERNAME", "bot@test")
    monkeypatch.setenv("SMTP_PASSWORD", "pw")
    monkeypatch.setenv("FEEDBACK_NOTIFICATION_EMAIL", "owner@example.com")


class _FakeSMTP:
    instances = []

    def __init__(self, host, port, timeout=None, **kwargs):
        self.host, self.port, self.sent, self.logged_in, self.tls = host, port, [], None, False
        _FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def ehlo(self):
        pass

    def starttls(self, context=None):
        self.tls = True

    def login(self, user, password):
        self.logged_in = (user, password)

    def send_message(self, message):
        self.sent.append(message)


def test_message_names_the_kind_and_links_to_the_review_inbox(monkeypatch):
    monkeypatch.delenv("ADMIN_REVIEW_URL", raising=False)
    message = build_approval_message(
        "audio_work",
        {"id": "abc", "title": "測試音聲", "creatorName": "", "contactEmail": "who@example.com"},
        sender="bot@test", recipients=["owner@example.com"],
    )
    body = message.get_content()
    assert "新的待核可：音聲作品投稿" in message["Subject"]
    assert message["Reply-To"] == "who@example.com"
    assert "title：測試音聲" in body
    assert "creatorName" not in body  # empty fields are skipped
    assert "項目編號：abc" in body
    assert "https://studio-open-scripts.shawnup.com/superadmin" in body


def test_message_truncates_long_fields_and_rejects_header_injection():
    message = build_approval_message(
        "new_resource",
        {"id": "x", "name": "a" * 1000, "contactEmail": "evil@example.com\r\nBcc: x@y.z"},
        sender="bot@test", recipients=["owner@example.com"],
    )
    assert "Reply-To" not in message
    assert len([line for line in message.get_content().splitlines() if line.startswith("name：")][0]) < 400


def test_notification_is_sent_over_tls_with_login(monkeypatch):
    _configure_smtp(monkeypatch)
    _FakeSMTP.instances.clear()
    monkeypatch.setattr(admin_notifications.smtplib, "SMTP", _FakeSMTP)
    notify_approval_request("voice_actor_claim", {"id": "c1", "voiceActor": "測試聲演"})
    (smtp,) = _FakeSMTP.instances
    assert (smtp.host, smtp.port, smtp.tls, smtp.logged_in) == ("smtp.test", 2525, True, ("bot@test", "pw"))
    assert smtp.sent[0]["To"] == "owner@example.com"


def test_notification_never_raises_when_unconfigured_or_smtp_fails(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    notify_approval_request("demo", {"id": "d1"})  # skipped quietly

    _configure_smtp(monkeypatch)

    def boom(*args, **kwargs):
        raise OSError("smtp down")

    monkeypatch.setattr(admin_notifications.smtplib, "SMTP", boom)
    notify_approval_request("demo", {"id": "d1"})  # logged, not raised


def test_audio_work_submission_notifies_once_and_skips_bots_and_duplicates(client, db_session, monkeypatch):
    sent = []
    monkeypatch.setattr(public_router, "notify_approval_request", lambda kind, fields: sent.append((kind, fields)))
    payload = {"title": "通知測試音聲", "url": "https://example.com/notify-audio", "accessType": "free", "confirmPublic": True}

    created = client.post("/api/public-audio-work-submissions", json=payload)
    assert created.status_code == 200
    assert [kind for kind, _ in sent] == ["audio_work"]
    assert sent[0][1]["id"] == created.json()["submissionId"]
    assert sent[0][1]["title"] == "通知測試音聲"

    assert client.post("/api/public-audio-work-submissions", json=payload).status_code == 409
    bot = client.post("/api/public-audio-work-submissions", json={**payload, "url": "https://example.com/bot", "website": "x"})
    assert bot.status_code == 200
    assert len(sent) == 1
    assert db_session.query(PublicAudioWorkSubmission).count() == 1


def test_new_resource_submission_notifies(client, monkeypatch):
    sent = []
    monkeypatch.setattr(resource_profiles_router, "notify_approval_request", lambda kind, fields: sent.append((kind, fields)))
    created = client.post("/api/production-resource-submissions", json={
        "name": "通知測試聲演", "category": "voice_actor", "bio": "介紹",
        "profileUrl": "https://example.com/profile", "links": [], "works": [],
        "submitterName": "投稿人", "contactEmail": "sub@example.com",
    })
    assert created.status_code == 200, created.text
    assert sent and sent[0][0] == "new_resource"
    assert sent[0][1]["name"] == "通知測試聲演" and sent[0][1]["contactEmail"] == "sub@example.com"
