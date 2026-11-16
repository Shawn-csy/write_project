import pytest

import models
from routers.public import _public_identity_projection
from services.work_participations import (
    catalog_participants, finalize_catalog_import, participations_by_persona,
    record_catalog_participant, record_participation, replace_catalog_participants,
)


def setup(db, status='approved'):
    db.add_all([models.User(id='admin-owner'), models.Organization(id='org', name='社團', ownerId='admin-owner'),
                models.Persona(id='p', displayName='同名'), models.Persona(id='other', displayName='同名')])
    db.flush()
    work = models.PublicAudioWorkSubmission(id='w', title='作品', url='https://example.com/work',
                                          organizationId='org', status=status, createdAt=1)
    db.add(work)
    db.flush()
    return work


def participant(role='scriptwriter', pid='p'):
    return dict(role=role, personaId=pid, creditedAs='舊署名', sourceUrl='https://example.com/source')


def test_identity_links_survive_renames_and_do_not_link_same_name(db_session):
    work = setup(db_session)
    for role in ('scriptwriter', 'voice_actor', 'recording_studio', 'post_production'):
        record_catalog_participant(db_session, work, participant(role))
    person = db_session.get(models.Persona, 'p')
    person.displayName = '新名稱'
    db_session.flush()
    projected = _public_identity_projection(db_session, person)
    assert {c['creditRole'] for c in projected.workParticipations} == {'scriptwriter', 'voice_actor', 'recording_studio', 'post_production'}
    assert {c['audioWorkId'] for c in projected.workParticipations} == {'w'}
    assert participations_by_persona(db_session, ['other'])['other'] == []


def test_unresolved_attributions_do_not_guess_identity_or_create_one(db_session):
    work = setup(db_session)
    replace_catalog_participants(db_session, work, [dict(role='post_production', creditedAs='同名')], reviewed=True)
    from services.identity_convergence import run_identity_convergence
    run_identity_convergence(db_session)
    assert db_session.query(models.Persona).count() == 2
    assert catalog_participants(db_session, ['w'])['w'][0]['personaId'] is None
    assert finalize_catalog_import(db_session, work_ids=['w'])['unresolved'][0]['creditedAs'] == '同名'


def test_review_can_explicitly_unlink_legacy_alias(db_session):
    work = setup(db_session)
    db_session.add(models.PersonaCreditName(personaId='p', role='scriptwriter', creditedAs='舊署名'))
    db_session.flush()
    replace_catalog_participants(db_session, work, [participant(pid=None)], reviewed=True)
    assert catalog_participants(db_session, ['w'])['w'][0]['personaId'] is None
    assert participations_by_persona(db_session, ['p'])['p'] == []


def test_pending_and_hidden_roles_do_not_leak(db_session):
    work = setup(db_session, status='pending')
    record_catalog_participant(db_session, work, participant('post_production'))
    person = db_session.get(models.Persona, 'p')
    assert _public_identity_projection(db_session, person).workParticipations == []
    work.status = 'approved'
    db_session.query(models.PersonaRole).filter_by(personaId='p', role='post_production').one().isVisible = False
    db_session.flush()
    assert _public_identity_projection(db_session, person).workParticipations == []
    record_catalog_participant(db_session, work, participant('post_production'))
    assert _public_identity_projection(db_session, person).workParticipations == []


def test_shared_writer_is_idempotent_and_links_external_works(db_session):
    work = setup(db_session)
    for _ in range(2):
        record_catalog_participant(db_session, work, participant())
        record_participation(db_session, persona_id='p', role='post_production', url='https://example.com/game',
                             title='遊戲', work_type='game', source='https://example.com/source')
    assert db_session.query(models.PersonaCredit).count() == 2
    assert db_session.query(models.AudioWorkCredit).count() == 1
    assert len(participations_by_persona(db_session, ['p'])['p']) == 2


def test_invalid_replacement_does_not_erase_existing_links(db_session):
    work = setup(db_session)
    record_catalog_participant(db_session, work, participant())
    with pytest.raises(ValueError):
        replace_catalog_participants(db_session, work, [participant(pid='missing')], reviewed=True)
    assert len(participations_by_persona(db_session, ['p'])['p']) == 1


def test_public_submission_to_review_workflow(client, db_session):
    setup(db_session)
    db_session.commit()
    payload = dict(title='新作品', url='https://example.com/new', confirmPublic=True,
                   organizationId='org', participants=[participant(pid=None)])
    response = client.post('/api/public-audio-work-submissions', json=payload)
    assert response.status_code == 200, response.text
    wid = response.json()['submissionId']
    headers = {'X-User-ID': 'admin-owner'}
    inbox = client.get('/api/admin/public-audio-work-submissions?unresolvedOnly=true', headers=headers)
    assert inbox.status_code == 200, inbox.text
    assert inbox.json()['items'][0]['unresolvedParticipantCount'] == 1
    denied = client.patch(f'/api/admin/public-audio-work-submissions/{wid}/status', json={'status': 'approved'})
    assert denied.status_code in (401, 403)
    approved = client.patch(f'/api/admin/public-audio-work-submissions/{wid}/status', headers=headers,
                            json={'status': 'approved', 'participants': [participant(), participant('recording_studio')]})
    assert approved.status_code == 200, approved.text
    assert approved.json()['unresolvedParticipantCount'] == 0
    profile = client.get('/api/public-personas/p').json()
    assert {c['creditRole'] for c in profile['workParticipations']} == {'scriptwriter', 'recording_studio'}
    assert client.get('/api/admin/public-audio-work-submissions?status=all&unresolvedOnly=true', headers=headers).json()['total'] == 0


def test_public_cannot_assign_identity(client, db_session):
    setup(db_session)
    db_session.commit()
    response = client.post('/api/public-audio-work-submissions', json=dict(
        title='越權', url='https://example.com/forged', confirmPublic=True, participants=[participant()]))
    assert response.status_code == 400
    assert db_session.query(models.PublicAudioWorkSubmission).filter_by(url='https://example.com/forged').count() == 0


def test_voice_only_legacy_import_gets_identity_links_and_audit(db_session):
    work = setup(db_session)
    work.voiceActorIds = ['p']
    db_session.flush()
    report = finalize_catalog_import(db_session, organization_id='org')
    assert report == {'works': 1, 'newIdentityLinks': 1, 'unresolved': [], 'otherSourceCredits': []}
    assert finalize_catalog_import(db_session, organization_id='org')['newIdentityLinks'] == 0
    assert _public_identity_projection(db_session, db_session.get(models.Persona, 'p')).roles == ['voice_actor']


def test_portfolio_cannot_bypass_pending_catalog_visibility(db_session):
    work = setup(db_session, status='pending')
    record_participation(db_session, persona_id='p', role='post_production', url=work.url, title='私有作品')
    assert db_session.query(models.PersonaCredit).one().audioWorkId == work.id
    assert participations_by_persona(db_session, ['p'])['p'] == []


def test_review_preserves_source_evidence_and_removes_obsolete_roles(db_session):
    work = setup(db_session)
    db_session.add(models.AudioWorkCredit(audioWorkId=work.id, role='script', sourceRole='劇本',
        creditedAs='舊署名', provenance='official_page', sourceUrl='https://example.com/original', checkedAt=1))
    db_session.flush()
    replace_catalog_participants(db_session, work, [participant()], reviewed=True)
    assert db_session.query(models.AudioWorkCredit).filter_by(sourceUrl='https://example.com/original').count() == 1
    replace_catalog_participants(db_session, work, [participant()], reviewed=True)
    assert db_session.query(models.PersonaCredit).count() == 1
    assert len(catalog_participants(db_session, [work.id])[work.id]) == 1
    replace_catalog_participants(db_session, work, [], reviewed=True)
    assert participations_by_persona(db_session, ['p'])['p'] == []


def test_snapshot_import_dry_run_can_rollback_and_is_idempotent(db_session):
    from scripts.import_work_participations import import_snapshot
    work = setup(db_session)
    snapshot = {'works': [{'url': work.url, 'title': work.title, 'participants': [participant()]},
                          {'url': 'https://example.com/game', 'title': '遊戲', 'workType': 'game',
                           'participants': [participant('post_production')]}]}
    with db_session.begin_nested() as transaction:
        import_snapshot(db_session, snapshot)
        assert db_session.query(models.PersonaCredit).count() == 2
        transaction.rollback()
    assert db_session.query(models.PersonaCredit).count() == 0
    for _ in range(2):
        import_snapshot(db_session, snapshot)
    assert db_session.query(models.PersonaCredit).count() == 2
    assert db_session.query(models.AudioWorkCredit).count() == 1


def test_new_catalog_snapshot_captures_all_source_roles_and_reports_unlinked(db_session):
    work = setup(db_session)
    report = finalize_catalog_import(db_session, organization_id='org', source_items=[{
        'url': work.url, 'credits': {'台本': ['新作者'], '錄音': '錄音團隊', '後製': '甲、乙'},
        'participants': [participant('voice_actor')],
    }])
    assert {p['role'] for p in report['unresolved']} == {'scriptwriter', 'recording_studio', 'post_production'}
    assert {p['creditedAs'] for p in report['unresolved']} == {'新作者', '錄音團隊', '甲、乙'}
    assert db_session.query(models.Persona).count() == 2
    assert len(catalog_participants(db_session, [work.id])[work.id]) == 4
    count = db_session.query(models.AudioWorkCredit).count()
    finalize_catalog_import(db_session, organization_id='org', source_items=[{
        'url': work.url, 'credits': {'台本': ['新作者'], '錄音': '錄音團隊', '後製': '甲、乙'},
    }])
    assert db_session.query(models.AudioWorkCredit).count() == count


def test_explicit_work_link_overrides_conflicting_legacy_name_mapping(db_session):
    work = setup(db_session)
    db_session.add(models.PersonaCreditName(personaId='other', role='scriptwriter', creditedAs='舊署名'))
    db_session.add(models.AudioWorkCredit(audioWorkId=work.id, role='script', sourceRole='台本',
        creditedAs='舊署名', provenance='official_page', sourceUrl=work.url, checkedAt=1))
    db_session.flush()
    record_catalog_participant(db_session, work, participant())
    assert participations_by_persona(db_session, ['other'])['other'] == []
    assert catalog_participants(db_session, [work.id])[work.id][0]['personaId'] == 'p'


def test_new_catalog_entry_adopts_existing_portfolio_link_without_duplicate(db_session):
    work = setup(db_session)
    db_session.add(models.PersonaCredit(personaId='p', role='post_production', title='外部作品',
                                       url=work.url, creditedAs='舊署名', source='https://example.com/source'))
    db_session.flush()
    finalize_catalog_import(db_session, organization_id='org')
    assert db_session.query(models.PersonaCredit).one().audioWorkId == work.id
    assert len(participations_by_persona(db_session, ['p'])['p']) == 1
    work.status = 'pending'
    db_session.flush()
    assert participations_by_persona(db_session, ['p'])['p'] == []


def test_newly_normalized_illustration_requires_explicit_work_identity(db_session):
    work = setup(db_session)
    db_session.add(models.PersonaCreditName(personaId='p', role='cover_art', creditedAs='同名'))
    db_session.add(models.AudioWorkCredit(audioWorkId=work.id, role='illustration', sourceRole='插畫',
        creditedAs='同名', provenance='catalog_description', sourceUrl=work.url, checkedAt=1))
    db_session.flush()
    assert participations_by_persona(db_session, ['p'])['p'] == []
    assert catalog_participants(db_session, [work.id])[work.id][0]['personaId'] is None
    record_catalog_participant(db_session, work, dict(role='cover_art', personaId='p', creditedAs='同名', sourceUrl=work.url))
    assert len(participations_by_persona(db_session, ['p'])['p']) == 1
