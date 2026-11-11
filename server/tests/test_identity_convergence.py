"""Every public profile is one Persona; production people, external writers and voice actors share it."""

import models
from routers import public_bundle as public_bundle_router
from services.identity_convergence import converge_and_commit, legacy_credit_resource_id


def _bundle(client):
    public_bundle_router.invalidate_public_bundle_cache()
    return client.get("/api/public-bundle?sections=productionResources").json()["productionResources"]


def _work(db, work_id, status="approved"):
    row = models.PublicAudioWorkSubmission(id=work_id, title=f"作品{work_id}", url=f"https://example.com/{work_id}",
                                           coverUrl=f"https://example.com/{work_id}.jpg", status=status, createdAt=1)
    db.add(row)
    db.flush()
    return row


def _credit(db, work, role, name):
    db.add(models.AudioWorkCredit(audioWorkId=work.id, role=role, sourceRole=role, creditedAs=name,
                                  provenance="official_page", sourceUrl=work.url, checkedAt=1))


def test_catalog_credit_name_becomes_an_identity_with_legacy_profile(client, db_session):
    approved, pending = _work(db_session, "a"), _work(db_session, "b", status="pending")
    _credit(db_session, approved, "cover_art", "新畫師")
    _credit(db_session, pending, "cover_art", "新畫師")
    legacy_id = legacy_credit_resource_id("cover_art", "新畫師")
    db_session.add(models.ProductionResourceEnrichment(
        id=legacy_id, profileUrl="https://example.com/artist", profileLabel="個人網站",
        avatarUrl="https://example.com/avatar.jpg", bio="插畫創作者", sourceUrl=approved.url, checkedAt=1))
    db_session.add(models.ProductionResourceLink(id="artist-social", resourceId=legacy_id, label="X",
                                                 url="https://x.com/artist", sourceUrl=approved.url, checkedAt=1))
    db_session.commit()
    converge_and_commit(db_session)

    [item] = _bundle(client)
    assert item["name"] == "新畫師"
    assert item["categories"] == ["cover_art"]
    assert item["legacyIds"] == [legacy_id]
    assert [(work["id"], work["creditRole"]) for work in item["works"]] == [("a", "cover_art")]
    assert item["avatarUrl"] == "https://example.com/avatar.jpg"
    assert item["bio"] == "插畫創作者"
    assert item["websiteUrl"] == "https://example.com/artist"
    assert item["links"] == [{"label": "X", "url": "https://x.com/artist"}]

    page = client.get(f"/api/public-personas/{item['id']}").json()
    assert page["roles"] == ["cover_art"]
    assert [work["title"] for work in page["productionCredits"]] == ["作品a"]


def test_curated_resource_maps_to_identity_and_hides_unapproved_works(client, db_session):
    db_session.add_all([
        models.ProductionResource(id="listed", name="公開工作室", categories=["recording_studio"], summary="錄音服務",
                                  websiteUrl="https://example.com/", sourceUrl="https://example.com/services",
                                  status="published", reviewedAt=1),
        models.ProductionResource(id="draft", name="待查工作室", categories=["recording_studio"], summary="待查",
                                  websiteUrl="https://example.org/", sourceUrl="https://example.org/",
                                  status="draft", reviewedAt=1),
    ])
    approved, pending = _work(db_session, "approved-work"), _work(db_session, "pending-work", status="pending")
    db_session.add_all([
        models.ProductionResourceCredit(resourceId="listed", audioWorkId=approved.id, creditRole="recording_studio", creditedAs="公開工作室"),
        models.ProductionResourceCredit(resourceId="listed", audioWorkId=pending.id, creditRole="recording_studio", creditedAs="公開工作室"),
    ])
    db_session.commit()
    converge_and_commit(db_session)

    [item] = _bundle(client)
    resource = db_session.query(models.ProductionResource).filter_by(id="listed").one()
    assert item["id"] == resource.personaId
    assert "listed" in item["legacyIds"]
    assert item["bio"] == "錄音服務"
    assert [work["id"] for work in item["works"]] == ["approved-work"]
    assert db_session.query(models.ProductionResource).filter_by(id="draft").one().personaId is None

    # The pending work shows up once it is approved and convergence runs again.
    pending.status = "approved"
    db_session.commit()
    converge_and_commit(db_session)
    assert {work["id"] for work in _bundle(client)[0]["works"]} == {"approved-work", "pending-work"}


def test_one_person_across_roles_keeps_one_page(client, db_session):
    voice = models.Persona(id="voice-1", displayName="一介", tags=["聲演"])
    db_session.add(voice)
    db_session.add(models.PersonaRole(personaId="voice-1", role="voice_actor", isVisible=True, sourceTypes=["demo"], profile={}))
    work = _work(db_session, "w1")
    _credit(db_session, work, "post_production", "一介")
    _credit(db_session, work, "cover_art", "一介")
    db_session.commit()
    converge_and_commit(db_session)

    assert db_session.query(models.Persona).count() == 1
    page = client.get("/api/public-personas/voice-1").json()
    assert page["roles"] == ["voice_actor", "post_production", "cover_art"]
    assert {work["creditRole"] for work in page["productionCredits"]} == {"post_production", "cover_art"}
    [item] = _bundle(client)
    assert item["id"] == "voice-1"
    assert item["otherRoles"] == ["voice_actor"]


def test_production_role_does_not_hide_derived_writer_or_actor_roles(client, db_session):
    """A persona without explicit core roles keeps the roles its works imply."""
    db_session.add(models.Persona(id="derived", displayName="海聶", tags=["聲演"]))
    work = _work(db_session, "w2")
    _credit(db_session, work, "post_production", "海聶")
    db_session.commit()
    converge_and_commit(db_session)
    assert client.get("/api/public-personas/derived").json()["roles"] == ["voice_actor", "post_production"]


def test_spelling_variants_share_one_identity(client, db_session):
    work_a, work_b = _work(db_session, "x1"), _work(db_session, "x2")
    _credit(db_session, work_a, "post_production", "TAKA")
    _credit(db_session, work_b, "post_production", "Taka")
    db_session.commit()
    converge_and_commit(db_session)
    [item] = _bundle(client)
    assert item["name"] == "Taka"
    assert {work["id"] for work in item["works"]} == {"x1", "x2"}
    assert set(item["legacyIds"]) == {legacy_credit_resource_id("post_production", "TAKA"),
                                      legacy_credit_resource_id("post_production", "Taka")}


def test_ambiguous_names_never_merge(client, db_session):
    db_session.add_all([models.Persona(id="p1", displayName="同名"), models.Persona(id="p2", displayName="同名")])
    _credit(db_session, _work(db_session, "y1"), "cover_art", "同名")
    db_session.commit()
    converge_and_commit(db_session)
    [item] = _bundle(client)
    assert item["id"] not in {"p1", "p2"}


def test_external_writer_is_linked_to_an_identity(client, db_session):
    author = models.ExternalAuthor(id="ext-1", canonicalKey="外部作者", displayName="外部作者", bio="外部介紹",
                                   profileUrl="https://x.com/writer", avatarUrl="https://example.com/w.jpg")
    hidden_draft = models.ExternalAuthor(id="ext-2", canonicalKey="草稿作者", displayName="草稿作者")
    db_session.add_all([author, hidden_draft])
    db_session.flush()
    db_session.add_all([
        models.ExternalPublicScript(id="ext-script", sourceUrl="https://example.com/s", status="published",
                                    externalAuthorId="ext-1", authorKey="外部作者", authorName="外部作者"),
        models.ExternalPublicScript(id="ext-draft", sourceUrl="https://example.com/d", status="draft",
                                    externalAuthorId="ext-2", authorKey="草稿作者", authorName="草稿作者"),
    ])
    db_session.commit()
    converge_and_commit(db_session)

    db_session.refresh(author)
    db_session.refresh(hidden_draft)
    assert author.linkedPersonaId
    assert hidden_draft.linkedPersonaId is None
    page = client.get(f"/api/public-personas/{author.linkedPersonaId}").json()
    assert page["roles"] == ["scriptwriter"]
    assert page["bio"] == "外部介紹"
    assert page["website"] == "https://x.com/writer"


def test_convergence_is_idempotent(db_session):
    _credit(db_session, _work(db_session, "z1"), "cover_art", "重跑畫師")
    db_session.commit()
    assert converge_and_commit(db_session).changed()
    assert not converge_and_commit(db_session).changed()
    assert db_session.query(models.Persona).count() == 1


def test_linking_a_writer_keeps_a_derived_voice_actor_role(client, db_session):
    db_session.add(models.Persona(id="both", displayName="雙棲", tags=["聲演"]))
    author = models.ExternalAuthor(id="ext-both", canonicalKey="雙棲", displayName="雙棲")
    db_session.add(author)
    db_session.flush()
    db_session.add(models.ExternalPublicScript(id="both-script", sourceUrl="https://example.com/both", status="published",
                                               externalAuthorId="ext-both", authorKey="雙棲", authorName="雙棲"))
    db_session.commit()
    converge_and_commit(db_session)
    assert client.get("/api/public-personas/both").json()["roles"] == ["scriptwriter", "voice_actor"]
