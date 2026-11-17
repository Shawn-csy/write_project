import pytest

import models
from scripts.backfill_recording_entity_types import apply_snapshot
from scripts.backfill_external_covers import apply_snapshot as apply_cover_snapshot


def test_source_reviewed_recording_types_are_idempotent_and_preserve_credits(db_session):
    db_session.add_all([
        models.Persona(id="person", displayName="錄音師"), models.Persona(id="studio", displayName="錄音工作室"),
        models.PersonaRole(personaId="person", role="recording_studio", profile={"commissionOffers": [{"service": "錄音"}]}),
        models.PersonaRole(personaId="studio", role="recording_studio", profile={}),
    ])
    db_session.flush()
    snapshot = {"identities": [
        {"personaId": "person", "entityType": "person", "sourceUrl": "https://example.com/person"},
        {"personaId": "studio", "entityType": "studio", "sourceUrl": "https://example.com/studio"},
    ]}
    assert len(apply_snapshot(db_session, snapshot)) == 2
    assert apply_snapshot(db_session, snapshot) == []
    assert db_session.query(models.PersonaRole).filter_by(personaId="person").one().profile["commissionOffers"] == [{"service": "錄音"}]
    with pytest.raises(ValueError):
        apply_snapshot(db_session, {"identities": [{"personaId": "missing", "entityType": "studio", "sourceUrl": "https://example.com"}]})


def test_reviewed_cxc_cover_backfill_is_idempotent_and_checks_work_identity(db_session):
    db_session.add(models.ExternalPublicScript(
        id="chapter", sourceUrl="https://cxc.today/@writer/work/46575/reader/298222",
        status="published", remoteTitle="作品", remoteSummary="原摘要", coverUrlOverride="",
    ))
    db_session.flush()
    snapshot = {"covers": [{"externalScriptId": "chapter", "workId": "46575",
                            "coverUrl": "https://cxc.today/fs/book/46575/coverphoto1768964373.png"}]}
    assert len(apply_cover_snapshot(db_session, snapshot)) == 1
    assert apply_cover_snapshot(db_session, snapshot) == []
    row = db_session.get(models.ExternalPublicScript, "chapter")
    assert row.remoteTitle == "作品" and row.remoteSummary == "原摘要"
    with pytest.raises(ValueError):
        apply_cover_snapshot(db_session, {"covers": [{"externalScriptId": "chapter", "workId": "45488",
            "coverUrl": "https://cxc.today/fs/book/45488/coverphoto1766575752.png"}]})
