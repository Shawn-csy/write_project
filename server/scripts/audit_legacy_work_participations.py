"""Rehearse reviewed identity links and compare legacy public work sets before rollout."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from scripts.backfill_snapshots import read_backfill_snapshot
import models
from routers.public import _production_credits_by_persona
from scripts.import_work_participations import import_snapshot
from services.work_participations import participations_by_persona


def audit(db, snapshot):
    people = db.query(models.Persona).all()
    works = {w.id: w for w in db.query(models.PublicAudioWorkSubmission).filter_by(status='approved')}
    credits = db.query(models.AudioWorkCredit).filter(models.AudioWorkCredit.audioWorkId.in_(works),
        models.AudioWorkCredit.role.in_(('script', 'author'))).all()
    candidates = {}
    for p in people:
        candidates.setdefault(p.displayName, []).append(p.id)
    names = sorted({c.creditedAs for c in credits})
    ambiguous = [name for name in names if len(candidates.get(name, [])) > 1]
    if ambiguous:
        raise ValueError(f'Ambiguous legacy names require review: {ambiguous}')
    baseline_scripts = {(candidates[c.creditedAs][0], c.audioWorkId) for c in credits if candidates.get(c.creditedAs)}
    baseline_production = {(pid, c['creditRole'], c.get('audioWorkId') or c['url'])
        for pid, items in _production_credits_by_persona(db, [p.id for p in people]).items() for c in items if c['creditRole'] in models.PRODUCTION_ROLES}
    baseline_voice = {(pid, w.id) for w in works.values() for pid in w.voiceActorIds or []}
    before_source_ids = {c.id for c in db.query(models.AudioWorkCredit)}
    report = import_snapshot(db, snapshot)
    actual = participations_by_persona(db, [p.id for p in people])
    scripts = {(pid, c['audioWorkId']) for pid, items in actual.items() for c in items if c['creditRole'] == 'scriptwriter'}
    production = {(pid, c['creditRole'], c.get('audioWorkId') or c['url'])
        for pid, items in actual.items() for c in items if c['creditRole'] in models.PRODUCTION_ROLES}
    voice = {(pid, c['audioWorkId']) for pid, items in actual.items() for c in items if c['creditRole'] == 'voice_actor' and c['audioWorkId']}
    differences = dict(missingScriptLinks=sorted(baseline_scripts - scripts), extraScriptLinks=sorted(scripts - baseline_scripts),
        missingProductionLinks=sorted(baseline_production - production), extraProductionLinks=sorted(production - baseline_production),
        missingVoiceLinks=sorted(baseline_voice - voice), extraVoiceLinks=sorted(voice - baseline_voice))
    if any(differences.values()):
        raise ValueError(json.dumps(differences, ensure_ascii=False))
    if not before_source_ids.issubset({c.id for c in db.query(models.AudioWorkCredit)}):
        raise ValueError('Source credits were removed')
    return dict(scriptSourceRows=len(credits), scriptNames=len(names), verifiedScriptLinks=len(scripts),
        productionLinks=len(production), voiceLinks=len(voice), differences=differences,
        unresolvedNames=[dict(name=name, works=len({c.audioWorkId for c in credits if c.creditedAs == name}))
                         for name in names if not candidates.get(name)], changes=report)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--database-name', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if urlparse(os.environ.get('DATABASE_URL', '')).path != '/' + args.database_name:
        raise SystemExit('Database target mismatch')
    with SessionLocal() as db:
        result = audit(db, read_backfill_snapshot(args.snapshot, "honglianScriptwriterLinks"))
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if args.apply:
            db.commit()
            print('Applied verified identity links')
        else:
            db.rollback()
            print('Dry run; all changes rolled back')


if __name__ == '__main__':
    main()
