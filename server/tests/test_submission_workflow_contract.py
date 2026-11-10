"""Shared contract for public intake and moderator review routes.

Add every new intake/review pair to WORKFLOWS. The route test is a small gate
against shipping a form without a review surface or authorization check.
"""

from dataclasses import dataclass

import pytest

from main import app
from models import AudioWorkCredit, ExternalAuthor, ExternalPublicScript, Organization, Persona, PersonaRole, ProductionResource, ProductionResourceCredit, ProductionResourceExternalWork, ProductionResourceProfileOverride, ProductionResourceSubmission, PublicAudioWorkSubmission, User
from routers import public as public_router
from routers import public_bundle as public_bundle_router
from routers import resource_profiles as resource_profiles_router
from routers import external_public_scripts as external_router
from dependencies import get_current_user_claims


@dataclass(frozen=True)
class Workflow:
    name: str
    create: str
    review: str
    review_method: str = "PATCH"
    review_status: str = "approved"


WORKFLOWS = (
    Workflow("台本投稿與問題回報", "/api/public-feedback", "/api/admin/public-feedback/{feedback_id}/status", review_status="reviewed"),
    Workflow("Demo 投稿", "/api/public-demo-submissions", "/api/admin/public-demo-submissions/{submission_id}/status"),
    Workflow("聲演自行投稿 Demo", "/api/my-demo-submissions", "/api/admin/public-demo-submissions/{submission_id}/status"),
    Workflow("音聲作品投稿", "/api/public-audio-work-submissions", "/api/admin/public-audio-work-submissions/{submission_id}/status"),
    Workflow("外部作者資料投稿", "/api/external-author-profile-submissions", "/api/admin/external-author-profile-submissions/{submission_id}/status"),
    Workflow("聲演資料投稿", "/api/voice-actor-profile-submissions", "/api/admin/voice-actor-profile-submissions/{submission_id}/status"),
    Workflow("資源資料投稿", "/api/production-resource-profile-submissions", "/api/admin/production-resource-profile-submissions/{submission_id}/status"),
    Workflow("新資源投稿", "/api/production-resource-submissions", "/api/admin/production-resource-submissions/{submission_id}/status"),
    Workflow("聲演身份認領", "/api/voice-actor-claims", "/api/admin/voice-actor-claims/{claim_id}/status"),
)

LIFECYCLE_TESTS = {
    "/api/public-feedback": "test_listing_submission_enters_moderation_inbox",
    "/api/public-demo-submissions": "test_demo_submission_is_private_until_approved",
    "/api/my-demo-submissions": "test_owned_demo_create_edit_delete_enforces_owner",
    "/api/public-audio-work-submissions": "test_audio_work_submission_is_private_until_approved",
    "/api/external-author-profile-submissions": "test_external_author_profile_review_applies_only_accepted_fields",
    "/api/voice-actor-profile-submissions": "test_voice_actor_profile_review_applies_only_accepted_fields",
    "/api/production-resource-profile-submissions": "test_resource_profile_review_applies_only_accepted_fields",
    "/api/production-resource-submissions": "test_new_resource_submission_is_private_until_approved",
    "/api/voice-actor-claims": "test_voice_actor_claim_requires_verified_google_and_cannot_overwrite_owner",
}


def test_every_intake_has_a_lifecycle_test():
    assert set(LIFECYCLE_TESTS) == {workflow.create for workflow in WORKFLOWS}
    assert all(callable(globals().get(name)) for name in LIFECYCLE_TESTS.values())


def test_all_public_intake_routes_are_registered():
    intake_routes = {
        route.path
        for route in app.routes
        if "POST" in getattr(route, "methods", set())
        and route.path.startswith("/api/")
        and not route.path.startswith("/api/admin/")
        and (
            route.path.endswith("-submissions")
            or route.path.endswith("-claims")
            or route.path == "/api/public-feedback"
        )
    }
    assert intake_routes == {workflow.create for workflow in WORKFLOWS}


def test_new_resource_submission_is_private_until_approved(client, db_session, monkeypatch):
    revalidated = []
    monkeypatch.setattr(resource_profiles_router, "_send_public_paths_revalidation", revalidated.append)
    work_url = "https://example.com/resource-work"
    db_session.add(PublicAudioWorkSubmission(id="resource-work", title="測試作品", url=work_url,
                    coverUrl="https://example.com/cover.jpg", status="approved", createdAt=1000))
    db_session.commit()
    payload = {"name": "新後製", "category": "post_production", "bio": "混音與剪輯",
               "avatarUrl": "https://example.com/avatar.jpg", "profileUrl": "https://example.com/profile",
               "links": [{"label": "X", "url": "https://x.com/example"}],
               "works": [{"title": "測試作品", "url": work_url}],
               "submitterName": "協作者", "contactEmail": "helper@example.com"}
    created = client.post("/api/production-resource-submissions", json=payload)
    assert created.status_code == 200, created.text
    submission_id = created.json()["submissionId"]
    assert db_session.query(ProductionResourceSubmission).filter_by(id=submission_id).one().status == "pending"
    assert not any(item["name"] == "新後製" for item in client.get("/api/public-bundle?sections=productionResources").json()["productionResources"])
    assert client.post("/api/production-resource-submissions", json=payload).status_code == 409
    pending = client.get("/api/admin/production-resource-submissions", headers={"X-User-ID": "admin-owner"})
    assert pending.status_code == 200 and pending.json()["total"] == 1
    approved = client.patch(f"/api/admin/production-resource-submissions/{submission_id}/status",
                            json={"status": "approved"}, headers={"X-User-ID": "admin-owner"})
    assert approved.status_code == 200, approved.text
    resource_id = approved.json()["publishedId"]
    assert revalidated == [["/resources", f"/resources/{resource_id}", "/sitemap.xml"]]
    assert db_session.query(ProductionResourceCredit).filter_by(resourceId=resource_id, audioWorkId="resource-work").count() == 1
    published = client.get("/api/public-bundle?sections=productionResources").json()["productionResources"]
    resource = next(item for item in published if item["id"] == resource_id)
    assert resource["works"][0]["title"] == "測試作品"
    assert resource["avatarUrl"] == payload["avatarUrl"]
    assert client.patch(f"/api/admin/production-resource-submissions/{submission_id}/status",
                        json={"status": "approved"}, headers={"X-User-ID": "admin-owner"}).status_code == 409


def test_new_resource_can_publish_a_game_outside_the_audio_catalog(client, db_session):
    payload = {"name": "待收錄封面師", "category": "cover_art", "profileUrl": "https://example.com/artist",
               "works": [{"title": "獨立遊戲", "url": "https://example.com/game", "workType": "game",
                          "coverUrl": "https://example.com/game-cover.jpg"}],
               "submitterName": "投稿者", "contactEmail": "sender@example.com"}
    assert client.post("/api/production-resource-submissions", json={**payload, "works": []}).status_code == 400
    created = client.post("/api/production-resource-submissions", json=payload)
    assert created.status_code == 200
    submission_id = created.json()["submissionId"]
    review = client.patch(f"/api/admin/production-resource-submissions/{submission_id}/status",
                          json={"status": "approved"}, headers={"X-User-ID": "admin-owner"})
    assert review.status_code == 200, review.text
    resource_id = review.json()["publishedId"]
    assert db_session.query(ProductionResourceExternalWork).filter_by(resourceId=resource_id).count() == 1
    item = next(item for item in client.get("/api/public-bundle?sections=productionResources").json()["productionResources"] if item["id"] == resource_id)
    assert item["works"][0]["title"] == "獨立遊戲"
    assert item["works"][0]["workType"] == "game"
    assert item["works"][0]["coverUrl"] == "https://example.com/game-cover.jpg"


def test_resource_submission_rejects_incomplete_or_excess_works(client):
    payload = {"name": "封面師乙", "category": "cover_art", "profileUrl": "https://example.com/artist",
               "works": [{"title": "遊戲封面", "url": "https://example.com/game", "workType": "game"}],
               "submitterName": "投稿者", "contactEmail": "sender@example.com"}
    incomplete = {**payload, "works": [*payload["works"], {"title": "遺漏網址的作品"}]}
    assert client.post("/api/production-resource-submissions", json=incomplete).status_code == 400
    excessive = {**payload, "works": payload["works"] * 21}
    assert client.post("/api/production-resource-submissions", json=excessive).status_code == 400
    pending = client.get("/api/admin/production-resource-submissions", headers={"X-User-ID": "admin-owner"})
    assert pending.json()["total"] == 0


def test_new_voice_actor_submission_publishes_only_after_approval(client, db_session):
    payload = {"name": "新聲演", "category": "voice_actor", "bio": "試音中",
               "profileUrl": "https://example.com/actor", "submitterName": "協作者",
               "contactEmail": "helper@example.com"}
    created = client.post("/api/production-resource-submissions", json=payload)
    assert created.status_code == 200, created.text
    assert not any(item["displayName"] == "新聲演" for item in client.get("/api/public-personas").json())
    approved = client.patch(f"/api/admin/production-resource-submissions/{created.json()['submissionId']}/status",
                            json={"status": "approved"}, headers={"X-User-ID": "admin-owner"})
    assert approved.status_code == 200, approved.text
    persona_id = approved.json()["publishedId"]
    assert db_session.query(PersonaRole).filter_by(personaId=persona_id, role="voice_actor").count() == 1
    assert client.get(f"/api/public-personas/{persona_id}").json()["displayName"] == "新聲演"


@pytest.mark.parametrize("workflow", WORKFLOWS, ids=lambda item: item.name)
def test_every_workflow_has_creation_and_moderation_routes(workflow):
    routes = {(route.path, method) for route in app.routes for method in getattr(route, "methods", set())}
    assert (workflow.create, "POST") in routes
    assert (workflow.review, workflow.review_method) in routes


@pytest.mark.parametrize("workflow", WORKFLOWS, ids=lambda item: item.name)
def test_moderation_requires_admin(client, workflow):
    url = workflow.review.format(feedback_id="missing", submission_id="missing", claim_id="missing")
    response = client.request(
        workflow.review_method,
        url,
        json={"status": workflow.review_status},
        headers={"X-User-ID": "ordinary-user"},
    )
    assert response.status_code in (401, 403)


def test_audio_work_submission_is_private_until_approved(client, db_session):
    payload = {"title": "測試音聲", "url": "https://example.com/audio-work", "accessType": "free", "confirmPublic": True}
    created = client.post("/api/public-audio-work-submissions", json=payload)
    assert created.status_code == 200
    item_id = created.json()["submissionId"]
    assert db_session.query(PublicAudioWorkSubmission).filter_by(id=item_id).one().status == "pending"
    assert item_id not in {item["id"] for item in client.get("/api/public-bundle").json()["audioWorks"]}

    duplicate = client.post("/api/public-audio-work-submissions", json=payload)
    assert duplicate.status_code == 409

    without_org = client.patch(
        f"/api/admin/public-audio-work-submissions/{item_id}/status",
        json={"status": "approved"}, headers={"X-User-ID": "admin-owner"},
    )
    assert without_org.status_code == 400
    db_session.add(Organization(id="audio-work-org", ownerId="admin-owner", name="測試團隊"))
    db_session.add(Persona(id="audio-work-actor", ownerId="admin-owner", displayName="測試聲演", voiceActorHidden=False))
    db_session.commit()

    unknown_actor = client.patch(
        f"/api/admin/public-audio-work-submissions/{item_id}/status",
        json={"status": "approved", "organizationId": "audio-work-org", "voiceActorIds": ["missing"]},
        headers={"X-User-ID": "admin-owner"},
    )
    assert unknown_actor.status_code == 400

    approved = client.patch(
        f"/api/admin/public-audio-work-submissions/{item_id}/status",
        json={"status": "approved", "organizationId": "audio-work-org", "voiceActorIds": ["audio-work-actor"]},
        headers={"X-User-ID": "admin-owner"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["reviewedAt"] is not None
    public_work = next(item for item in client.get("/api/public-bundle").json()["audioWorks"] if item["id"] == item_id)
    assert public_work["voiceActors"] == [{"id": "audio-work-actor", "name": "測試聲演"}]
    assert public_work["accessType"] == "free"

    rejected = client.patch(
        f"/api/admin/public-audio-work-submissions/{item_id}/status",
        json={"status": "rejected"},
        headers={"X-User-ID": "admin-owner"},
    )
    assert rejected.status_code == 200
    assert item_id not in {item["id"] for item in client.get("/api/public-bundle").json()["audioWorks"]}


def test_audio_work_organization_is_reviewed_and_public_only_after_approval(client, db_session):
    org = Organization(id="audio-org", ownerId="admin-owner", name="測試音聲組織", bannerUrl="https://example.com/banner.jpg")
    db_session.add(org)
    db_session.commit()
    created = client.post("/api/public-audio-work-submissions", json={
        "title": "組織作品", "url": "https://example.com/group-audio", "organizationId": org.id, "confirmPublic": True,
    })
    assert created.status_code == 200
    item_id = created.json()["submissionId"]
    before = client.get("/api/public-bundle").json()
    assert org.id not in {item["id"] for item in before["organizations"]}
    assert item_id not in {item["id"] for item in before["audioWorks"]}

    approved = client.patch(f"/api/admin/public-audio-work-submissions/{item_id}/status", json={
        "status": "approved", "organizationId": org.id,
    }, headers={"X-User-ID": "admin-owner"})
    assert approved.status_code == 200
    public = client.get("/api/public-bundle").json()
    assert {item["organizationId"] for item in public["audioWorks"] if item["id"] == item_id} == {org.id}
    assert org.id in {item["id"] for item in public["organizations"]}
    assert client.get(f"/api/public-organizations/{org.id}").status_code == 200

def test_listing_submission_enters_moderation_inbox(client, monkeypatch):
    monkeypatch.setattr(public_router, "send_public_feedback_notification", lambda payload: None)
    created = client.post(
        "/api/public-feedback",
        json={
            "kind": "listing",
            "contactName": "投稿者",
            "scriptTitle": "測試台本",
            "authorName": "台本師",
            "documentUrl": "https://example.com/script",
        },
    )
    assert created.status_code == 200
    item_id = created.json()["feedbackId"]
    inbox = client.get("/api/admin/public-feedback", headers={"X-User-ID": "admin-owner"})
    assert inbox.status_code == 200
    assert item_id in {item["id"] for item in inbox.json()["items"]}
    reviewed = client.patch(
        f"/api/admin/public-feedback/{item_id}/status",
        json={"status": "reviewed"},
        headers={"X-User-ID": "admin-owner"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == "reviewed"
    monkeypatch.setattr(external_router, "fetch_external_public_script_metadata", lambda url: {
        "sourceUrl": url, "canonicalUrl": url, "sourceDomain": "example.com",
        "sourceName": "Example", "remoteTitle": "測試台本", "remoteSummary": "",
        "remoteCoverUrl": "",
    })
    draft = client.post("/api/admin/external-public-scripts", json={
        "sourceUrl": "https://example.com/script", "authorName": "台本師",
        "titleOverride": "測試台本", "status": "draft",
    }, headers={"X-User-ID": "admin-owner"})
    assert draft.status_code == 200
    assert draft.json()["status"] == "draft"
    closed = client.patch(f"/api/admin/public-feedback/{item_id}/status", json={
        "status": "closed",
    }, headers={"X-User-ID": "admin-owner"})
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"


def test_demo_submission_is_private_until_approved(client, monkeypatch):
    monkeypatch.setattr(external_router, "fetch_external_public_script_metadata", lambda url: {
        "sourceUrl": url,
        "canonicalUrl": url,
        "sourceDomain": "example.com",
        "sourceName": "Example",
        "remoteTitle": "公開台本",
        "remoteSummary": "摘要",
        "remoteCoverUrl": "",
    })
    external = client.post(
        "/api/admin/external-public-scripts",
        json={"sourceUrl": "https://example.com/script", "status": "published"},
        headers={"X-User-ID": "admin-owner"},
    )
    assert external.status_code == 200
    created = client.post("/api/public-demo-submissions", json={
        "scriptType": "external",
        "externalScriptId": external.json()["id"],
        "demoName": "試聽",
        "demoUrl": "https://example.com/demo",
        "manualVoiceActors": [{"name": "測試聲演", "socialUrl": "https://example.com/actor"}],
        "confirmPublic": True,
        "confirmVoiceActorProfiles": True,
    })
    assert created.status_code == 200
    item_id = created.json()["submissionId"]
    assert item_id not in {item["id"] for item in client.get("/api/public-bundle").json()["demoSubmissions"]}
    pending = client.get("/api/admin/public-demo-submissions", headers={"X-User-ID": "admin-owner"})
    assert item_id in {item["id"] for item in pending.json()["items"]}

    approved = client.patch(
        f"/api/admin/public-demo-submissions/{item_id}/status",
        json={"status": "approved"},
        headers={"X-User-ID": "admin-owner"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert item_id in {item["id"] for item in client.get("/api/public-bundle").json()["demoSubmissions"]}


def test_external_author_profile_review_applies_only_accepted_fields(client, db_session, monkeypatch):
    monkeypatch.setattr(external_router, "fetch_external_public_script_metadata", lambda url: {
        "sourceUrl": url, "canonicalUrl": url, "sourceDomain": "example.com",
        "sourceName": "Example", "remoteTitle": "公開台本", "remoteSummary": "摘要",
        "remoteCoverUrl": "", "authorName": "原作者",
    })
    source = client.post("/api/admin/external-public-scripts", json={
        "sourceUrl": "https://example.com/author-script", "status": "published", "authorName": "原作者",
    }, headers={"X-User-ID": "admin-owner"})
    assert source.status_code == 200
    author = db_session.query(ExternalAuthor).one()
    payload = {
        "externalAuthorId": author.id, "authorKey": author.canonicalKey,
        "displayName": "新署名", "bio": "新介紹", "submitterName": "協作者",
        "contactEmail": "writer@example.com", "contributorName": "協作者",
    }
    created = client.post("/api/external-author-profile-submissions", json=payload)
    assert created.status_code == 200
    item_id = created.json()["submissionId"]
    assert client.post("/api/external-author-profile-submissions", json=payload).status_code == 409
    approved = client.patch(f"/api/admin/external-author-profile-submissions/{item_id}/status", json={
        "status": "approved", "acceptedFields": ["displayName"],
    }, headers={"X-User-ID": "admin-owner"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["currentProfile"]["displayName"] == "新署名"
    assert approved.json()["currentProfile"].get("bio") != "新介紹"
    assert client.patch(f"/api/admin/external-author-profile-submissions/{item_id}/status", json={
        "status": "rejected",
    }, headers={"X-User-ID": "admin-owner"}).status_code == 409


def test_voice_actor_profile_review_applies_only_accepted_fields(client, db_session):
    persona = Persona(id="voice-profile", displayName="原聲演", bio="舊介紹", tags=["聲演"])
    db_session.add(persona)
    db_session.commit()
    payload = {
        "personaId": persona.id, "displayName": "新聲演", "bio": "新介紹",
        "submitterName": "協作者", "contactEmail": "actor@example.com", "contributorName": "協作者",
    }
    created = client.post("/api/voice-actor-profile-submissions", json=payload)
    assert created.status_code == 200
    item_id = created.json()["submissionId"]
    assert client.post("/api/voice-actor-profile-submissions", json=payload).status_code == 409
    approved = client.patch(f"/api/admin/voice-actor-profile-submissions/{item_id}/status", json={
        "status": "approved", "acceptedFields": ["bio"],
    }, headers={"X-User-ID": "admin-owner"})
    assert approved.status_code == 200
    db_session.refresh(persona)
    assert persona.displayName == "原聲演"
    assert persona.bio == "新介紹"
    assert client.patch(f"/api/admin/voice-actor-profile-submissions/{item_id}/status", json={
        "status": "rejected",
    }, headers={"X-User-ID": "admin-owner"}).status_code == 409


def test_resource_profile_review_applies_only_accepted_fields(client, db_session, monkeypatch):
    revalidated = []
    monkeypatch.setattr(resource_profiles_router, "_send_public_paths_revalidation", revalidated.append)
    resource = ProductionResource(
        id="studio-resource", name="原工作室", categories=["recording_studio"],
        summary="原介紹", websiteUrl="https://example.com/studio", sourceUrl="https://example.com/studio",
        status="published", reviewedAt=1,
    )
    first = PublicAudioWorkSubmission(id="first-resource-work", title="原作品", url="https://example.com/first", status="approved")
    second = PublicAudioWorkSubmission(id="second-resource-work", title="新作品", url="https://example.com/second", status="approved")
    db_session.add_all([resource, first, second])
    db_session.flush()
    db_session.add(ProductionResourceCredit(resourceId=resource.id, audioWorkId=first.id, creditRole="recording_studio", creditedAs=resource.name))
    db_session.commit()
    payload = {
        "resourceId": resource.id, "displayName": "新工作室", "bio": "新介紹",
        "links": [{"label": "X", "url": "https://x.com/studio"}],
        "works": [{"title": "新作品", "url": second.url, "creditRole": "recording_studio"}],
        "submitterName": "協作者", "contactEmail": "studio@example.com", "contributorName": "協作者",
    }
    assert client.post("/api/production-resource-profile-submissions", json={
        **payload, "works": [{**payload["works"][0], "title": ""}],
    }).status_code == 400
    created = client.post("/api/production-resource-profile-submissions", json=payload)
    assert created.status_code == 200, created.text
    submission_id = created.json()["submissionId"]
    assert client.post("/api/production-resource-profile-submissions", json=payload).status_code == 409
    before = client.get("/api/public-bundle?sections=productionResources").json()["productionResources"][0]
    assert before["name"] == "原工作室"
    approved = client.patch(f"/api/admin/production-resource-profile-submissions/{submission_id}/status", json={
        "status": "approved", "acceptedFields": ["bio", "links", "works", "contributorName"],
    }, headers={"X-User-ID": "admin-owner"})
    assert revalidated == [["/resources", "/resources/studio-resource", "/sitemap.xml"]]
    assert approved.status_code == 200, approved.text
    after = next(item for item in client.get("/api/public-bundle?sections=productionResources").json()["productionResources"] if item["id"] == resource.id)
    assert after["name"] == "原工作室"
    assert after["bio"] == "新介紹"
    assert after["links"] == [{"label": "X", "url": "https://x.com/studio"}]
    assert {work["id"] for work in after["works"]} == {first.id, second.id}
    assert after["contributors"][0]["name"] == "協作者"
    assert db_session.query(ProductionResourceProfileOverride).filter_by(id=resource.id).one().profile["bio"] == "新介紹"


def test_resource_profile_can_add_non_audio_work(client, db_session):
    resource = ProductionResource(id="game-studio", name="遊戲配音室", categories=["recording_studio"],
                                  summary="", websiteUrl="https://example.com/studio", sourceUrl="https://example.com/studio",
                                  status="published", reviewedAt=1)
    audio = PublicAudioWorkSubmission(id="existing-audio", title="已收錄音聲", url="https://example.com/audio", status="approved")
    db_session.add_all([resource, audio])
    db_session.flush()
    db_session.add(ProductionResourceCredit(resourceId=resource.id, audioWorkId=audio.id,
                                          creditRole="recording_studio", creditedAs=resource.name))
    db_session.commit()
    created = client.post("/api/production-resource-profile-submissions", json={
        "resourceId": resource.id, "displayName": resource.name, "works": [{"title": "配音遊戲",
        "url": "https://example.com/game", "workType": "game", "coverUrl": "https://example.com/game.jpg",
        "creditRole": "recording_studio"}], "submitterName": "投稿者", "contactEmail": "sender@example.com",
        "contributorName": "投稿者",
    })
    assert created.status_code == 200, created.text
    reviewed = client.patch(f"/api/admin/production-resource-profile-submissions/{created.json()['submissionId']}/status",
                            json={"status": "approved", "acceptedFields": ["works"]},
                            headers={"X-User-ID": "admin-owner"})
    assert reviewed.status_code == 200, reviewed.text
    works = next(item["works"] for item in client.get("/api/public-bundle?sections=productionResources").json()["productionResources"] if item["id"] == resource.id)
    assert {work["workType"] for work in works} == {"audio", "game"}


def test_derived_resource_profile_and_work_can_be_reviewed(client, db_session):
    first = PublicAudioWorkSubmission(id="derived-first", title="原作品", url="https://example.com/derived-first", status="approved")
    second = PublicAudioWorkSubmission(id="derived-second", title="新作品", url="https://example.com/derived-second", status="approved")
    db_session.add_all([first, second])
    db_session.flush()
    db_session.add(AudioWorkCredit(audioWorkId=first.id, role="cover_art", sourceRole="封面", creditedAs="插畫家甲", provenance="official_page", sourceUrl=first.url, checkedAt=1))
    db_session.commit()
    public_bundle_router.invalidate_public_bundle_cache()
    before = next(item for item in client.get("/api/public-bundle?sections=productionResources").json()["productionResources"] if item["name"] == "插畫家甲")
    payload = {
        "resourceId": before["id"], "displayName": "插畫家甲", "bio": "作品介紹",
        "works": [{"title": "新作品", "url": second.url, "creditRole": "cover_art"}],
        "submitterName": "協作者", "contactEmail": "artist@example.com", "contributorName": "協作者",
    }
    created = client.post("/api/production-resource-profile-submissions", json=payload)
    assert created.status_code == 200, created.text
    approved = client.patch(f"/api/admin/production-resource-profile-submissions/{created.json()['submissionId']}/status", json={
        "status": "approved", "acceptedFields": ["bio", "works"],
    }, headers={"X-User-ID": "admin-owner"})
    assert approved.status_code == 200, approved.text
    after = next(item for item in client.get("/api/public-bundle?sections=productionResources").json()["productionResources"] if item["id"] == before["id"])
    assert after["bio"] == "作品介紹"
    assert {work["id"] for work in after["works"]} == {first.id, second.id}


def test_voice_actor_claim_requires_verified_google_and_cannot_overwrite_owner(client, db_session):
    persona = Persona(id="claimable-voice", displayName="待認領聲演", tags=["聲演"])
    db_session.add(persona)
    db_session.commit()
    payload = {"personaId": persona.id, "proofUrl": "https://example.com/proof"}
    denied = client.post("/api/voice-actor-claims", json=payload, headers={"X-User-ID": "requester"})
    assert denied.status_code == 403

    async def verified_google_claims():
        return {"uid": "requester", "email": "requester@example.com", "email_verified": True,
                "firebase": {"sign_in_provider": "google.com"}}

    app.dependency_overrides[get_current_user_claims] = verified_google_claims
    try:
        created = client.post("/api/voice-actor-claims", json=payload)
    finally:
        app.dependency_overrides.pop(get_current_user_claims, None)
    assert created.status_code == 200
    claim_id = created.json()["id"]
    approved = client.patch(f"/api/admin/voice-actor-claims/{claim_id}/status", json={
        "status": "approved",
    }, headers={"X-User-ID": "admin-owner"})
    assert approved.status_code == 200
    db_session.refresh(persona)
    assert persona.ownerId == "requester"
    app.dependency_overrides[get_current_user_claims] = verified_google_claims
    try:
        assert client.post("/api/voice-actor-claims", json=payload).status_code == 409
    finally:
        app.dependency_overrides.pop(get_current_user_claims, None)
    assert client.patch(f"/api/admin/voice-actor-claims/{claim_id}/status", json={
        "status": "approved",
    }, headers={"X-User-ID": "admin-owner"}).status_code == 409


def test_owned_demo_create_edit_delete_enforces_owner(client, db_session):
    db_session.add(User(id="demo-owner", email="owner@example.com"))
    db_session.add(Persona(id="owned-voice", ownerId="demo-owner", displayName="我的聲演", tags=["聲演"]))
    db_session.add(ExternalPublicScript(id="demo-source", sourceUrl="https://example.com/source", remoteTitle="公開台本", status="published"))
    db_session.commit()
    payload = {"scriptType": "external", "externalScriptId": "demo-source", "voiceActorPersonaId": "owned-voice",
               "demoName": "我的試聽", "demoUrl": "https://example.com/demo"}
    assert client.post("/api/my-demo-submissions", json=payload, headers={"X-User-ID": "stranger"}).status_code == 404
    created = client.post("/api/my-demo-submissions", json=payload, headers={"X-User-ID": "demo-owner"})
    assert created.status_code == 200
    item_id = created.json()["id"]
    assert created.json()["status"] == "approved"
    update = {"demoName": "改過的試聽", "demoUrl": "https://example.com/demo-new"}
    assert client.put(f"/api/my-demo-submissions/{item_id}", json=update, headers={"X-User-ID": "stranger"}).status_code == 404
    changed = client.put(f"/api/my-demo-submissions/{item_id}", json=update, headers={"X-User-ID": "demo-owner"})
    assert changed.status_code == 200
    assert changed.json()["demoName"] == "改過的試聽"
    assert client.delete(f"/api/my-demo-submissions/{item_id}", headers={"X-User-ID": "stranger"}).status_code == 404
    assert client.delete(f"/api/my-demo-submissions/{item_id}", headers={"X-User-ID": "demo-owner"}).status_code == 200


def test_activity_listing_requires_open_activity_and_publishes_immediately(client, db_session, monkeypatch):
    monkeypatch.setattr(public_router, "send_public_feedback_notification", lambda payload: None)
    created_page = client.post("/api/admin/activity-pages", json={
        "slug": "submission-test", "title": "徵件活動", "status": "published",
        "acceptingSubmissions": False,
    }, headers={"X-User-ID": "admin-owner"})
    assert created_page.status_code == 200
    page_id = created_page.json()["id"]
    payload = {
        "kind": "listing", "activityPageId": page_id, "contactName": "投稿者",
        "scriptTitle": "活動台本", "authorName": "台本師",
        "documentUrl": "https://example.com/activity-script", "confirmPublicListing": True,
    }
    assert client.post("/api/public-feedback", json=payload).status_code == 404
    opened = client.put(f"/api/admin/activity-pages/{page_id}", json={
        "slug": "submission-test", "title": "徵件活動", "status": "published",
        "acceptingSubmissions": True,
    }, headers={"X-User-ID": "admin-owner"})
    assert opened.status_code == 200
    assert client.post("/api/public-feedback", json={**payload, "confirmPublicListing": False}).status_code == 400
    submitted = client.post("/api/public-feedback", json=payload)
    assert submitted.status_code == 200
    item_id = submitted.json()["feedbackId"]
    activity = client.get(f"/api/admin/activity-pages/{page_id}/submissions", headers={"X-User-ID": "admin-owner"})
    assert activity.status_code == 200
    assert item_id in {item["id"] for item in activity.json()["items"]}
    script = db_session.query(ExternalPublicScript).filter_by(sourceUrl=payload["documentUrl"]).one()
    assert script.status == "published"
    edited = client.put(f"/api/admin/activity-pages/{page_id}/submissions/script/{item_id}", json={
        "title": "修正後的台本", "link": payload["documentUrl"],
    }, headers={"X-User-ID": "admin-owner"})
    assert edited.status_code == 200
    assert edited.json()["title"] == "修正後的台本"


def test_admin_direct_additions_require_admin_and_attach_demo_to_script(client, db_session):
    db_session.add(ExternalPublicScript(
        id="admin-demo-source", sourceUrl="https://example.com/admin-source",
        remoteTitle="管理員台本", status="published",
    ))
    db_session.commit()
    actor_payload = {"displayName": "新增聲演"}
    assert client.post("/api/admin/voice-actors", json=actor_payload,
                       headers={"X-User-ID": "ordinary-user"}).status_code == 403
    actor = client.post("/api/admin/voice-actors", json=actor_payload,
                        headers={"X-User-ID": "admin-owner"})
    assert actor.status_code == 200
    assert db_session.query(Persona).filter_by(id=actor.json()["id"]).one().displayName == "新增聲演"

    demo_payload = {
        "sourceKind": "external", "parentId": "admin-demo-source",
        "demoName": "新增試聽", "demoUrl": "https://example.com/admin-demo",
    }
    assert client.post("/api/admin/all-demos", json=demo_payload,
                       headers={"X-User-ID": "ordinary-user"}).status_code == 403
    demo = client.post("/api/admin/all-demos", json=demo_payload,
                       headers={"X-User-ID": "admin-owner"})
    assert demo.status_code == 200
    assert demo.json()["demoName"] == "新增試聽"
    db_session.expire_all()
    assert "https://example.com/admin-demo" in db_session.query(ExternalPublicScript).filter_by(id="admin-demo-source").one().demoLinks
