"""Identity-based work participation, shared by public reads and reviewed writes.

Legacy storage remains readable during rollout. Explicit work/person/role links
live in PersonaCredit; AudioWorkCredit retains the source's original attribution.
No read path resolves an identity by its current display name.
"""
import time
from collections import defaultdict
from types import SimpleNamespace

import models

ROLES = ('scriptwriter', 'voice_actor', *models.PRODUCTION_ROLES)
SOURCE_ROLES = {'script': 'scriptwriter', 'author': 'scriptwriter', 'scriptwriter': 'scriptwriter', 'voice_actor': 'voice_actor',
                'post_production': 'post_production', 'cover_art': 'cover_art',
                'illustration': 'cover_art', 'recording': 'recording_studio'}
# Illustration is newly normalized; legacy cover aliases do not confirm an illustration credit.
LEGACY_ALIAS_SOURCE_ROLES = set(SOURCE_ROLES) - {'illustration'}
CANONICAL_SOURCE = {'scriptwriter': 'script', 'voice_actor': 'voice_actor',
                    'post_production': 'post_production', 'cover_art': 'cover_art', 'recording_studio': 'recording'}


def participations_by_persona(db, persona_ids):
    result = {pid: [] for pid in persona_ids}
    seen = set()

    def add(pid, role, work=None, credit=None, name=''):
        if pid not in result or role not in ROLES:
            return
        key = (pid, role, work.id if work else credit.url or credit.id)
        if key in seen:
            return
        seen.add(key)
        result[pid].append(dict(
            id=work.id if work else credit.id, audioWorkId=work.id if work else None,
            title=work.title if work else credit.title, url=work.url if work else credit.url,
            coverUrl=(work.coverUrl if work else credit.coverUrl) or '', creditRole=role,
            creditedAs=name, workType='audio' if work else credit.workType,
            publishedAt=(work.publishedAt or work.createdAt) if work else credit.createdAt,
        ))

    if not persona_ids:
        return result
    catalog = db.query(models.PublicAudioWorkSubmission).all()
    approved = {w.id: w for w in catalog if w.status == 'approved'}
    by_url = defaultdict(list)
    for work in catalog:
        by_url[work.url].append(work)
    for credit in db.query(models.PersonaCredit).filter(models.PersonaCredit.personaId.in_(persona_ids)):
        work = approved.get(credit.audioWorkId)
        if credit.audioWorkId and not work:
            continue
        if not credit.audioWorkId and credit.url in by_url:
            matches = by_url[credit.url]
            if len(matches) != 1 or matches[0].status != 'approved':
                continue
            work = matches[0]
        add(credit.personaId, credit.role, work, credit, credit.creditedAs)
    names = {(n.role, n.creditedAs): n.personaId for n in db.query(models.PersonaCreditName).filter(
        models.PersonaCreditName.personaId.in_(persona_ids))}
    if names and approved:
        credits = db.query(models.AudioWorkCredit).filter(models.AudioWorkCredit.audioWorkId.in_(approved)).all()
        authoritative = {(c.audioWorkId, SOURCE_ROLES.get(c.role), c.creditedAs) for c in credits if c.provenance in {'submission', 'reviewed_participation'}}
        authoritative.update(db.query(models.PersonaCredit.audioWorkId, models.PersonaCredit.role, models.PersonaCredit.creditedAs)
                             .filter(models.PersonaCredit.audioWorkId.in_(approved)).all())
        for credit in credits:
            if (credit.audioWorkId, SOURCE_ROLES.get(credit.role), credit.creditedAs) in authoritative:
                continue
            if credit.provenance in {"submission", "reviewed_participation"}:
                continue
            if credit.role not in LEGACY_ALIAS_SOURCE_ROLES:
                continue
            role = SOURCE_ROLES.get(credit.role)
            pid = names.get((role, credit.creditedAs))
            if pid:
                add(pid, role, approved[credit.audioWorkId], name=credit.creditedAs)
    for work in approved.values():
        for pid in work.voiceActorIds or []:
            add(pid, 'voice_actor', work)
    # Legacy portfolio entries belong to the containing identity, never to a name match.
    role_rows = {(r.personaId, r.role): r for r in db.query(models.PersonaRole).filter(models.PersonaRole.personaId.in_(persona_ids))}
    for person in db.query(models.Persona).filter(models.Persona.id.in_(persona_ids)):
        voice = role_rows.get((person.id, 'voice_actor'))
        profile = voice.profile if voice and isinstance(voice.profile, dict) else {}
        legacy = profile.get('works') or person.voiceActorWorks or []
        for index, entry in enumerate(legacy):
            if not isinstance(entry, dict):
                continue
            url = entry.get('url') or ''
            matches = by_url.get(url, [])
            if matches and (len(matches) != 1 or matches[0].status != 'approved'):
                continue
            work = matches[0] if matches else None
            legacy_id = f'legacy-voice-{person.id}-{index}'
            credit = SimpleNamespace(id=legacy_id, title=entry.get('title') or '', url=url,
                                     coverUrl=entry.get('coverUrl') or '', workType=entry.get('workType') or 'audio', createdAt=0)
            # Entries without URLs cannot safely be merged by title.
            key = (person.id, 'voice_actor', work.id if work else url or legacy_id)
            if key not in seen:
                add(person.id, 'voice_actor', work, credit)
            item = next((r for r in result[person.id] if r['creditRole'] == 'voice_actor' and
                         ((url and r['url'] == url) or r['id'] == legacy_id)), None)
            if item:
                for field, value in [('characterName', entry.get('role')), ('description', entry.get('description'))]:
                    if value and value != item.get(field):
                        item[field] = '；'.join(filter(None, [item.get(field), value]))
        for item in result[person.id]:
            role_row = role_rows.get((person.id, item['creditRole']))
            profile = role_row.profile if role_row and isinstance(role_row.profile, dict) else {}
            details = (profile.get('participationDetails') or {}).get(item['url'], {})
            item.update({k: details[k] for k in ('characterName', 'description') if k in details})
    for items in result.values():
        items.sort(key=lambda item: item['publishedAt'] or 0, reverse=True)
    return result


def catalog_participants(db, work_ids):
    """Return editable attributions, including unresolved source names, in batches."""
    result = {wid: [] for wid in work_ids}
    if not work_ids:
        return result
    explicit = defaultdict(list)
    for c in db.query(models.PersonaCredit).filter(models.PersonaCredit.audioWorkId.in_(work_ids)):
        if c.role in ROLES:
            explicit[(c.audioWorkId, c.role, c.creditedAs)].append(c.personaId)
    aliases = {(n.role, n.creditedAs): n.personaId for n in db.query(models.PersonaCreditName)}
    seen = set()
    sources = db.query(models.AudioWorkCredit).filter(models.AudioWorkCredit.audioWorkId.in_(work_ids)).all()
    sources.sort(key=lambda c: c.provenance not in {'submission', 'reviewed_participation'})
    for c in sources:
        role = SOURCE_ROLES.get(c.role)
        if not role:
            continue
        key = (c.audioWorkId, role, c.creditedAs)
        if key in seen:
            continue
        seen.add(key)
        pids = explicit.get(key) or [None if c.provenance in {'submission', 'reviewed_participation'} or c.role not in LEGACY_ALIAS_SOURCE_ROLES else aliases.get((role, c.creditedAs))]
        for pid in pids:
            result[c.audioWorkId].append(dict(role=role, personaId=pid, creditedAs=c.creditedAs,
                                             sourceUrl=c.sourceUrl or '', sourceRole=c.sourceRole))
    for (wid, role, name), pids in explicit.items():
        if (wid, role, name) not in seen:
            for pid in pids:
                result[wid].append(dict(role=role, personaId=pid, creditedAs=name, sourceUrl=''))
    works = db.query(models.PublicAudioWorkSubmission).filter(models.PublicAudioWorkSubmission.id.in_(work_ids)).all()
    actor_ids_all = {pid for work in works for pid in work.voiceActorIds or []}
    actors = {p.id: p for p in db.query(models.Persona).filter(models.Persona.id.in_(actor_ids_all))} if actor_ids_all else {}
    for work in works:
        actor_ids = set(work.voiceActorIds or [])
        present = {p['personaId'] for p in result[work.id] if p['role'] == 'voice_actor'}
        for person in [actors[pid] for pid in sorted(actor_ids - present) if pid in actors]:
            result[work.id].append(dict(role='voice_actor', personaId=person.id,
                                        creditedAs=person.displayName or '', sourceUrl=work.url))
    return result


def record_participation(db, *, persona_id, role, url, title='', cover_url='', work_type='audio',
                         credited_as='', audio_work_id=None, source='', character_name=None, description=None):
    """Idempotent reviewed write shared by moderation and importers; never commits."""
    db.flush()  # Other adapters may have pending role rows in this non-autoflush session.
    if role not in ROLES or not db.get(models.Persona, persona_id):
        raise ValueError('找不到參與身份或職務無效')
    if not audio_work_id:
        matches = db.query(models.PublicAudioWorkSubmission).filter_by(url=url).all()
        if len(matches) > 1:
            raise ValueError('作品連結對應多筆目錄資料，請先確認作品身份')
        if matches:
            audio_work_id = matches[0].id
    if audio_work_id:
        work = db.get(models.PublicAudioWorkSubmission, audio_work_id)
        if not work:
            raise ValueError('找不到作品')
        url = work.url
    if not url:
        raise ValueError('請提供作品連結')
    if role in {'scriptwriter', 'voice_actor'} and not db.query(models.PersonaRole).filter(
            models.PersonaRole.personaId == persona_id, models.PersonaRole.role.in_(('scriptwriter', 'voice_actor'))).first():
        # Making core roles explicit must preserve roles previously derived from scripts/demos.
        from routers.public import _public_identity_projection
        current = _public_identity_projection(db, db.get(models.Persona, persona_id)).roles
        for existing in current:
            if existing in {'scriptwriter', 'voice_actor'} and existing != role:
                db.add(models.PersonaRole(personaId=persona_id, role=existing, isVisible=True, sourceTypes=['work_participation'], profile={}))
    row = db.query(models.PersonaCredit).filter_by(personaId=persona_id, role=role, url=url).first()
    if row is None:
        row = models.PersonaCredit(personaId=persona_id, role=role, url=url)
        db.add(row)
    row.audioWorkId, row.title, row.coverUrl = audio_work_id, title, cover_url
    row.workType, row.creditedAs, row.source = work_type, credited_as, source
    # Do not undo an explicit visibility choice.
    role_row = db.query(models.PersonaRole).filter_by(personaId=persona_id, role=role).first()
    if role_row is None:
        db.add(models.PersonaRole(personaId=persona_id, role=role, isVisible=True,
                                 sourceTypes=['work_participation'], profile={}))
    db.flush()
    if character_name is not None or description is not None:
        role_row = db.query(models.PersonaRole).filter_by(personaId=persona_id, role=role).one()
        profile = dict(role_row.profile or {})
        details = dict(profile.get('participationDetails') or {})
        entry = dict(details.get(url) or {})
        if character_name is not None:
            entry['characterName'] = str(character_name).strip()[:200]
        if description is not None:
            entry['description'] = str(description).strip()[:1000]
        details[url] = entry
        role_row.profile = {**profile, 'participationDetails': details}
    return row


def replace_catalog_participants(db, work, participants, *, reviewed=False):
    """Replace the supported roster atomically; unknown source roles are preserved.

    Public submissions may supply source names but only reviewers can attach IDs.
    The caller owns commit/rollback and cache invalidation.
    """
    people = {}
    for p in participants:
        if p['role'] not in ROLES or not p['creditedAs'].strip():
            raise ValueError('請填寫參與者署名及有效職務')
        pid = p.get('personaId')
        if pid:
            if not reviewed:
                raise ValueError('身份關聯需由管理員確認')
            people[pid] = db.get(models.Persona, pid)
            if people[pid] is None:
                raise ValueError('找不到參與身份')
    keys = [(p['role'], p['creditedAs'], p.get('personaId')) for p in participants]
    if len(keys) != len(set(keys)):
        raise ValueError('同一職務與署名不可重複')
    linked_keys = [(p['role'], p['personaId']) for p in participants if p.get('personaId')]
    if len(linked_keys) != len(set(linked_keys)):
        raise ValueError('同一身份在同一職務請保留一筆主要署名')
    wanted = {(p['role'], p['creditedAs']) for p in participants}
    for old in db.query(models.AudioWorkCredit).filter_by(audioWorkId=work.id):
        role = SOURCE_ROLES.get(old.role)
        if role and (role, old.creditedAs) not in wanted:
            db.delete(old)
    db.query(models.PersonaCredit).filter(models.PersonaCredit.audioWorkId == work.id,
        models.PersonaCredit.role.in_(ROLES)).delete(synchronize_session=False)
    work.voiceActorIds = []
    now = int(time.time() * 1000)
    source_keys = set()
    for p in participants:
        source_key = (p['role'], p['creditedAs'])
        if source_key not in source_keys:
            source_keys.add(source_key)
            provenance = 'reviewed_participation' if reviewed else 'submission'
            source = db.query(models.AudioWorkCredit).filter_by(audioWorkId=work.id,
                role=CANONICAL_SOURCE[p['role']], creditedAs=p['creditedAs'], provenance=provenance).first()
            if source is None:
                source = models.AudioWorkCredit(audioWorkId=work.id, role=CANONICAL_SOURCE[p['role']],
                    creditedAs=p['creditedAs'], provenance=provenance)
                db.add(source)
            source.sourceRole = p.get('sourceRole') or p['role']
            source.sourceUrl = p.get('sourceUrl') or work.url
            source.checkedAt = now
        if p.get('personaId'):
            record_participation(db, persona_id=p['personaId'], role=p['role'], url=work.url,
                title=work.title, cover_url=work.coverUrl or '', credited_as=p['creditedAs'],
                audio_work_id=work.id, source=p.get('sourceUrl') or work.url)
            if p['role'] == 'voice_actor':
                work.voiceActorIds = list(dict.fromkeys([*work.voiceActorIds, p['personaId']]))
    db.flush()


def record_catalog_participant(db, work, participant, *, authoritative=False):
    """Add a reviewed source credit and optional explicit ID without replacing a roster."""
    from schemas import WorkParticipantInput
    p = WorkParticipantInput.model_validate(participant).model_dump()
    if p.get('personaId') and not db.get(models.Persona, p['personaId']):
        raise ValueError('找不到參與身份')
    source_role = CANONICAL_SOURCE[p['role']]
    source_query = db.query(models.AudioWorkCredit).filter_by(
        audioWorkId=work.id, creditedAs=p['creditedAs']).filter(
            models.AudioWorkCredit.role.in_([source for source, role in SOURCE_ROLES.items() if role == p['role']]))
    if authoritative:
        source_query = source_query.filter_by(provenance='reviewed_participation')
    if source_query.first() is None:
        db.add(models.AudioWorkCredit(audioWorkId=work.id, role=source_role,
            sourceRole=p.get('sourceRole') or p['role'], creditedAs=p['creditedAs'],
            provenance='reviewed_participation', sourceUrl=p.get('sourceUrl') or work.url,
            checkedAt=int(time.time() * 1000)))
    if p.get('personaId'):
        record_participation(db, persona_id=p['personaId'], role=p['role'], url=work.url,
            title=work.title, cover_url=work.coverUrl or '', audio_work_id=work.id,
            credited_as=p['creditedAs'], source=p.get('sourceUrl') or work.url)
        if p['role'] == 'voice_actor':
            work.voiceActorIds = list(dict.fromkeys([*(work.voiceActorIds or []), p['personaId']]))
    db.flush()


def reconcile_catalog_participants(db, work, participants, current, retired_ids=()):
    """Apply reviewed changes to named credits without rewriting other entries."""
    expected = defaultdict(set)
    observed = defaultdict(set)
    linked = set()
    retired = set(retired_ids)
    for p in participants:
        role, name, pid = p['role'], p['creditedAs'], p.get('personaId')
        if pid and (pid in retired or (role, pid) in linked):
            raise ValueError(f"Invalid or duplicate reviewed credit for {pid}: {name}")
        if pid:
            linked.add((role, pid))
        expected[role, name].add(pid)
    for p in current:
        observed[p['role'], p['creditedAs']].add(p.get('personaId'))
    changed = {key for key, ids in expected.items() if ids != observed[key]}
    retired_keys = {key for key, ids in observed.items() if ids & retired}
    if not changed and not retired_keys:
        return False

    credits = db.query(models.PersonaCredit).filter_by(url=work.url).all()
    removed = set()
    kept = {}
    for credit in credits:
        key = (credit.role, credit.creditedAs)
        person = (credit.role, credit.personaId)
        if credit.personaId in retired or (key in changed and credit.personaId not in expected[key]):
            db.delete(credit)
            removed.add(person)
        else:
            kept[person] = credit.creditedAs

    for role, name in changed:
        if role == 'voice_actor':
            removed.update((role, pid) for pid in observed[role, name] - expected[role, name]
                           if pid and (role, pid) not in kept)
    work.voiceActorIds = [pid for pid in (work.voiceActorIds or [])
                         if pid not in retired and ('voice_actor', pid) not in removed]
    db.flush()

    for role, name in retired_keys - expected.keys():
        # Preserve the source name and prevent its retiring alias from being
        # materialized again by finalization in the same transaction.
        source = next(p for p in current if p['role'] == role and p['creditedAs'] == name)
        record_catalog_participant(db, work, {**source, 'personaId': None}, authoritative=True)
    for p in participants:
        role, name, pid = p['role'], p['creditedAs'], p.get('personaId')
        if (role, name) not in changed:
            continue
        if pid and (role, pid) in kept:
            if kept[role, pid] != name:
                raise ValueError(f"Reviewed credit conflicts with an existing credit for {pid}: {name}")
            # The identity link is intact. Only ensure the reviewed source row.
            p = {**p, 'personaId': None}
        record_catalog_participant(db, work, p, authoritative=expected[role, name] == {None})
    return True


def finalize_catalog_import(db, *, organization_id=None, work_ids=None, source_items=()):
    """Shared final step for catalog importers, within their transaction and scope.

    Materialize only already-confirmed aliases/voice IDs. Unknown names remain
    unresolved and are reported; this never guesses a person by display name.
    """
    if organization_id is None and work_ids is None:
        raise ValueError('Specify the imported organization or work IDs')
    db.flush()
    query = db.query(models.PublicAudioWorkSubmission)
    if organization_id is not None:
        query = query.filter_by(organizationId=organization_id)
    if work_ids is not None:
        query = query.filter(models.PublicAudioWorkSubmission.id.in_(work_ids))
    works = {work.id: work for work in query.all()}
    by_url = {work.url: work for work in works.values()}
    # A newly cataloged external portfolio work keeps the same identity link.
    for credit in db.query(models.PersonaCredit).filter(models.PersonaCredit.audioWorkId.is_(None),
                                                       models.PersonaCredit.url.in_(by_url)):
        credit.audioWorkId = by_url[credit.url].id
    db.flush()
    for item in source_items:
        work = by_url.get(item['url'])
        if work is None:
            raise ValueError(f"Snapshot work outside import scope: {item['url']}")
        for p in item.get('participants', []):
            record_catalog_participant(db, work, p)
        source_credits = item.get('sourceCredits') or item.get('credits') or {}
        for label, names in source_credits.items():
            for name in names if isinstance(names, list) else [names]:
                if not str(name).strip():
                    continue
                role = SOURCE_LABEL_ROLES.get(label, label)
                record_source_credit(db, models.AudioWorkCredit(audioWorkId=work.id,
                    role=role, sourceRole=label, creditedAs=str(name).strip(),
                    provenance='source_import', sourceUrl=item.get('sourceUrl') or work.url,
                    checkedAt=int(time.time() * 1000)))
    db.flush()
    roster = catalog_participants(db, list(works))
    linked = 0
    for wid, participants in roster.items():
        work = works[wid]
        for p in participants:
            if not p.get('personaId'):
                continue
            existing = db.query(models.PersonaCredit).filter_by(personaId=p['personaId'], role=p['role'], url=work.url).first()
            if existing is None:
                linked += 1
                record_participation(db, persona_id=p['personaId'], role=p['role'], url=work.url,
                    title=work.title, cover_url=work.coverUrl or '', audio_work_id=work.id,
                    credited_as=p['creditedAs'], source=p.get('sourceUrl') or work.url)
    unresolved = [dict(workId=wid, title=works[wid].title, **p)
                  for wid, people in catalog_participants(db, list(works)).items() for p in people if not p.get('personaId')]
    return {'works': len(works), 'newIdentityLinks': linked, 'unresolved': unresolved,
            'otherSourceCredits': [dict(workId=wid, **c) for wid, entries in other_source_credits(db, list(works)).items() for c in entries]}


def record_source_credit(db, credit):
    """Adapter for existing researched source snapshots; identity confirmation stays explicit."""
    role = SOURCE_ROLES.get(credit.role)
    if role is None:
        present = db.query(models.AudioWorkCredit).filter_by(audioWorkId=credit.audioWorkId,
            role=credit.role, creditedAs=credit.creditedAs, provenance=credit.provenance).first()
        if not present:
            db.add(credit)
            db.flush()
        return
    work = db.get(models.PublicAudioWorkSubmission, credit.audioWorkId)
    if not work:
        raise ValueError('找不到作品')
    existing_ids = {c.id for c in db.query(models.AudioWorkCredit).filter_by(audioWorkId=work.id)}
    record_catalog_participant(db, work, dict(role=role, creditedAs=credit.creditedAs,
        sourceRole=credit.sourceRole, sourceUrl=credit.sourceUrl))
    for row in db.query(models.AudioWorkCredit).filter_by(audioWorkId=work.id):
        if row.id not in existing_ids:
            row.provenance = 'source_import'
            row.checkedAt = credit.checkedAt
    db.flush()


# Preserve unsplit composite names as unresolved text; separators can be part of a stage name.
SOURCE_LABEL_ROLES = {
    '台本': 'script', '劇本': 'script', 'シナリオ': 'script', '作者': 'author',
    '聲演': 'voice_actor', '配音': 'voice_actor', '声優': 'voice_actor', '聲演署名': 'voice_actor',
    '後製': 'post_production', '音效・後製': 'post_production',
    '封面': 'cover_art', '插畫': 'cover_art', 'イラスト': 'cover_art', '美術': 'cover_art',
    '錄音': 'recording',
}


def other_source_credits(db, work_ids):
    """Keep source roles outside the five supported categories visible to reviewers."""
    result = {wid: [] for wid in work_ids}
    if work_ids:
        for c in db.query(models.AudioWorkCredit).filter(models.AudioWorkCredit.audioWorkId.in_(work_ids),
                                                       ~models.AudioWorkCredit.role.in_(SOURCE_ROLES)):
            result[c.audioWorkId].append(dict(sourceRole=c.sourceRole, creditedAs=c.creditedAs, sourceUrl=c.sourceUrl))
    return result


def apply_profile_participations(db, persona, works):
    """Apply approved additive portfolios for every role through the same writer."""
    for work in works:
        record_participation(db, persona_id=persona.id, role=work['creditRole'], url=work['url'],
                             title=work.get('title') or '', cover_url=work.get('coverUrl') or '',
                             work_type=work.get('workType') or 'audio', credited_as=persona.displayName or '',
                             source='profile_submission', character_name=work.get('characterName'),
                             description=work.get('description'))



def profile_review_works(db, persona, proposal):
    if proposal.get('workFormat') != 'participation-v1' and proposal.get('profileKind', 'voice_actor') == 'voice_actor':
        return persona.voiceActorWorks or []
    kind = proposal.get('profileKind')
    roles = {'scriptwriter'} if kind == 'author' else {'voice_actor'} if kind == 'voice_actor' else set(models.PRODUCTION_ROLES)
    return [item for item in participations_by_persona(db, [persona.id])[persona.id] if item['creditRole'] in roles]
