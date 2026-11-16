"""Add reviewed work/identity/role links from a source-backed JSON snapshot.

python -m scripts.import_work_participations snapshot.json --database-name write_project_dev [--apply]
See docs/engineering/work-participations.md for the input contract.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from models import PublicAudioWorkSubmission, PersonaCredit, AudioWorkCredit
from schemas import WorkParticipantInput
from services.work_participations import record_catalog_participant, record_participation, finalize_catalog_import


def import_snapshot(db, snapshot):
    before_links = db.query(PersonaCredit).count()
    before_sources = db.query(AudioWorkCredit).count()
    work_ids = []
    for item in snapshot['works']:
        url = item['url']
        if urlparse(url).scheme != 'https':
            raise ValueError('作品連結必須為 HTTPS')
        matches = db.query(PublicAudioWorkSubmission).filter_by(url=url).all()
        if len(matches) > 1:
            raise ValueError(f'Duplicate catalog URL: {url}')
        work = matches[0] if matches else None
        if work:
            work_ids.append(work.id)
        for raw in item['participants']:
            p = WorkParticipantInput.model_validate(raw).model_dump()
            if not p['sourceUrl']:
                raise ValueError('匯入參與紀錄必須提供查核來源')
            if work:
                record_catalog_participant(db, work, p)
            else:
                if not p['personaId']:
                    raise ValueError('目錄外作品需確認身份後再匯入個人作品集')
                record_participation(db, persona_id=p['personaId'], role=p['role'], url=url,
                    title=item['title'], cover_url=item.get('coverUrl', ''),
                    work_type=item.get('workType', 'audio'), credited_as=p['creditedAs'], source=p['sourceUrl'])
    report = finalize_catalog_import(db, work_ids=work_ids)
    report["createdIdentityLinks"] = db.query(PersonaCredit).count() - before_links
    report["createdSourceCredits"] = db.query(AudioWorkCredit).count() - before_sources
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--database-name', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if urlparse(os.environ.get('DATABASE_URL', '')).path != '/' + args.database_name:
        raise SystemExit('Database name does not match the explicitly selected target')
    snapshot = json.loads(args.snapshot.read_text())
    with SessionLocal() as db:
        print(json.dumps(import_snapshot(db, snapshot), ensure_ascii=False, indent=2))
        if args.apply:
            db.commit()
            print('Applied')
        else:
            db.rollback()
            print('Dry run; rolled back')


if __name__ == '__main__':
    main()
