"""Fold every public profile into one identity model: Persona + PersonaRole.

Writers, voice actors, external (imported) writers and production people
(post-production, cover art, recording studios) used to live in different
tables with their own public pages. After convergence each of them is a
Persona whose roles say which sections its single page shows:

- ExternalAuthor rows with published scripts are linked to a Persona
  (ExternalAuthor.linkedPersonaId) with the scriptwriter role.
- Curated ProductionResource rows become a Persona with one role per category;
  their reviewed credits move to PersonaCredit, and ProductionResource.personaId
  remembers the replacement so old /resources/<id> addresses can redirect.
- Names printed in catalog credit lists (AudioWorkCredit.creditedAs) are mapped
  to a Persona through PersonaCreditName.

A name that already belongs to exactly one Persona is reused, so a voice actor
who also does post-production keeps one page. Every step is idempotent and runs
on startup; it can be previewed with
``python -m services.identity_convergence --dry-run``.
"""

from __future__ import annotations

import hashlib
import sys
import time
import unicodedata
import uuid
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

import models

PRODUCTION_ROLES = models.PRODUCTION_ROLES
_SOURCE_ROLE_TO_ROLE = {"post_production": "post_production", "cover_art": "cover_art", "recording": "recording_studio"}

# Spelling variants seen in catalog credit lists that mean the same person.
CREDIT_NAME_ALIASES = {
    ("post_production", "TAKA"): "Taka",
    ("post_production", "韾笙重工(他卡)"): "韾笙重工",
    ("post_production", "韾笙重工(鍋子)"): "韾笙重工",
    ("post_production", "韾笙重工（他卡）"): "韾笙重工",
    ("post_production", "韾笙重工（鍋子）"): "韾笙重工",
    ("cover_art", "雨宮luky"): "雨宮ルキ",
    ("cover_art", "キャロット(蘿蔔)"): "キャロット（蘿蔔）",
}


def name_key(value: object) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).strip().casefold()


def legacy_credit_resource_id(role: str, credited_as: str) -> str:
    """The id the old derived /resources/credit-… page used for this credited name."""
    digest = hashlib.sha256(f"{role}\0{credited_as}".encode()).hexdigest()[:16]
    return f"credit-{digest}"


@dataclass
class ConvergenceReport:
    createdPersonas: list[str] = field(default_factory=list)
    mergedIntoExisting: list[str] = field(default_factory=list)
    linkedExternalAuthors: int = 0
    linkedResources: int = 0
    creditNames: int = 0
    credits: int = 0
    roles: int = 0

    def changed(self) -> bool:
        return bool(self.createdPersonas or self.mergedIntoExisting or self.linkedExternalAuthors
                    or self.linkedResources or self.creditNames or self.credits or self.roles)


class _Converger:
    """Holds lookups for one run; the session does not autoflush, so pending rows are tracked here."""

    def __init__(self, db: Session):
        self.db = db
        self.now = int(time.time() * 1000)
        self.report = ConvergenceReport()
        self.personas: dict[str, models.Persona] = {row.id: row for row in db.query(models.Persona).all()}
        self.roles: dict[tuple[str, str], models.PersonaRole] = {
            (row.personaId, row.role): row for row in db.query(models.PersonaRole).all()
        }
        self.credit_names: dict[tuple[str, str], str] = {
            (row.role, row.creditedAs): row.personaId for row in db.query(models.PersonaCreditName).all()
        }
        self.credits: set[tuple[str, str, str]] = {
            (row.personaId, row.role, row.url) for row in db.query(models.PersonaCredit).all()
        }

    # ── identity lookup ─────────────────────────────────────────────────────

    def _persona_for_name(self, name: str) -> models.Persona | None:
        key = name_key(name)
        if not key:
            return None
        named = {pid for (_, credited), pid in self.credit_names.items() if name_key(credited) == key}
        if len(named) == 1:
            return self.personas.get(next(iter(named)))
        matches = [persona for persona in self.personas.values() if name_key(persona.displayName) == key]
        return matches[0] if len(matches) == 1 else None

    def persona_for(self, name: str, *, avatar: str = "", bio: str = "", website: str = "", links: list | None = None) -> models.Persona:
        persona = self._persona_for_name(name)
        if persona is None:
            persona = models.Persona(
                id=str(uuid.uuid4()), ownerId=None, displayName=name.strip()[:120],
                avatar="", bio="", website="", links=[], tags=[], organizationIds=[],
                voiceActorWorks=[], voiceActorOrganizations=[], voiceActorContributors=[],
                createdAt=self.now, updatedAt=self.now,
            )
            self.db.add(persona)
            # Rows that point at this persona have no ORM relationship to order them,
            # so insert it now or PostgreSQL rejects their foreign keys.
            self.db.flush()
            self.personas[persona.id] = persona
            self.report.createdPersonas.append(persona.displayName)
        elif persona.displayName not in self.report.createdPersonas:
            self.report.mergedIntoExisting.append(f"{name} → {persona.displayName} ({persona.id})")
        self.fill_profile(persona, avatar=avatar, bio=bio, website=website, links=links)
        return persona

    def fill_profile(self, persona: models.Persona, *, avatar: str = "", bio: str = "", website: str = "", links: list | None = None) -> None:
        """Only fill blanks: reviewed or owner-edited profile fields always win."""
        if avatar and not persona.avatar:
            persona.avatar = avatar[:2000]
        if bio and not persona.bio:
            persona.bio = bio[:4000]
        if website and not persona.website:
            persona.website = website[:2000]
        clean_links = [item for item in links or [] if isinstance(item, dict) and str(item.get("url") or "").strip()]
        if clean_links:
            existing = [item for item in (persona.links or []) if isinstance(item, dict)]
            seen = {str(item.get("url") or "").strip() for item in existing} | {str(persona.website or "").strip()}
            added = [item for item in clean_links if str(item.get("url")).strip() not in seen]
            if added:
                persona.links = [*existing, *({"label": str(item.get("label") or "連結"), "url": str(item["url"]).strip()} for item in added)][:30]

    def add_contributors(self, persona: models.Persona, contributors: list) -> None:
        existing = [item for item in (persona.voiceActorContributors or []) if isinstance(item, dict)]
        seen = {(item.get("name"), item.get("contributedAt")) for item in existing}
        added = [item for item in contributors or [] if isinstance(item, dict) and (item.get("name"), item.get("contributedAt")) not in seen]
        if added:
            persona.voiceActorContributors = [*existing, *added][-100:]

    def ensure_role(self, persona_id: str, role: str, source: str) -> None:
        record = self.roles.get((persona_id, role))
        if record is None:
            record = models.PersonaRole(
                id=str(uuid.uuid4()), personaId=persona_id, role=role, isVisible=True,
                sourceTypes=[source], profile={}, createdAt=self.now, updatedAt=self.now,
            )
            self.db.add(record)
            self.roles[(persona_id, role)] = record
            self.report.roles += 1
            return
        sources = [str(value) for value in (record.sourceTypes or []) if value]
        if source not in sources:
            record.sourceTypes = [*sources, source]
            record.updatedAt = self.now

    def ensure_writer_role(self, persona_id: str) -> None:
        """Record the writer role only where roles are already explicit.

        A persona without writer/actor role records has both derived from its
        works; one explicit record would switch that derivation off and could
        hide a voice-actor role, and linked external scripts already derive
        the writer role.
        """
        if any((persona_id, role) in self.roles for role in ("scriptwriter", "voice_actor")):
            self.ensure_role(persona_id, "scriptwriter", "external_script")

    def ensure_credit_name(self, persona_id: str, role: str, credited_as: str) -> None:
        credited_as = str(credited_as or "").strip()
        if not credited_as or (role, credited_as) in self.credit_names:
            return
        self.db.add(models.PersonaCreditName(id=str(uuid.uuid4()), personaId=persona_id, role=role,
                                             creditedAs=credited_as, createdAt=self.now))
        self.credit_names[(role, credited_as)] = persona_id
        self.report.creditNames += 1

    def add_credit(self, persona_id: str, role: str, *, url: str, title: str = "", cover_url: str = "",
                   work_type: str = "audio", credited_as: str = "", audio_work_id: str | None = None,
                   source: str = "") -> None:
        url = str(url or "").strip()
        if not url or (persona_id, role, url) in self.credits:
            return
        self.db.add(models.PersonaCredit(
            id=str(uuid.uuid4()), personaId=persona_id, role=role, audioWorkId=audio_work_id,
            title=title or "", url=url, coverUrl=cover_url or "", workType=work_type or "audio",
            creditedAs=credited_as or "", source=source, createdAt=self.now,
        ))
        self.credits.add((persona_id, role, url))
        self.report.credits += 1

    # ── sources ─────────────────────────────────────────────────────────────

    def _legacy_profile(self, resource_id: str, enrichments: dict, overrides: dict, links: dict) -> dict:
        enrichment = enrichments.get(resource_id)
        override = overrides.get(resource_id)
        profile = dict(override.profile) if override and isinstance(override.profile, dict) else {}
        return {
            "displayName": profile.get("displayName") or "",
            "avatar": profile.get("avatarUrl") or (enrichment.avatarUrl if enrichment else ""),
            "bio": profile.get("bio") or (enrichment.bio if enrichment else ""),
            "website": profile.get("profileUrl") or (enrichment.profileUrl if enrichment else ""),
            "links": profile.get("links") or [{"label": row.label, "url": row.url} for row in links.get(resource_id, [])],
            "contributors": (override.contributors if override and isinstance(override.contributors, list) else []),
        }

    def converge(self) -> ConvergenceReport:
        db = self.db
        enrichments = {row.id: row for row in db.query(models.ProductionResourceEnrichment).all()}
        overrides = {row.id: row for row in db.query(models.ProductionResourceProfileOverride).all()}
        links: dict[str, list] = {}
        for row in db.query(models.ProductionResourceLink).all():
            links.setdefault(row.resourceId, []).append(row)
        external_works: dict[str, list] = {}
        for row in db.query(models.ProductionResourceExternalWork).all():
            external_works.setdefault(row.resourceId, []).append(row)
        audio_works = {row.id: row for row in db.query(models.PublicAudioWorkSubmission).filter(
            models.PublicAudioWorkSubmission.status == "approved").all()}

        # 1. Curated production resources.
        resource_credits: dict[str, list] = {}
        for row in db.query(models.ProductionResourceCredit).all():
            resource_credits.setdefault(row.resourceId, []).append(row)
        for resource in db.query(models.ProductionResource).filter(models.ProductionResource.status == "published").all():
            if resource.personaId and resource.personaId in self.personas:
                persona = self.personas[resource.personaId]
                legacy = self._legacy_profile(resource.id, enrichments, overrides, links)
                self.fill_profile(persona, avatar=legacy["avatar"], bio=legacy["bio"], website=legacy["website"], links=legacy["links"])
            else:
                legacy = self._legacy_profile(resource.id, enrichments, overrides, links)
                persona = self.persona_for(
                    legacy["displayName"] or resource.name, avatar=legacy["avatar"],
                    bio=legacy["bio"] or resource.summary or "",
                    website=legacy["website"] or resource.websiteUrl or resource.sourceUrl or "",
                    links=legacy["links"],
                )
                self.add_contributors(persona, legacy["contributors"])
                resource.personaId = persona.id
                self.report.linkedResources += 1
            for role in [value for value in (resource.categories or []) if value in PRODUCTION_ROLES]:
                self.ensure_role(persona.id, role, "production_resource")
                self.ensure_credit_name(persona.id, role, resource.name)
            for credit in resource_credits.get(resource.id, []):
                if credit.creditRole not in PRODUCTION_ROLES:
                    continue
                self.ensure_role(persona.id, credit.creditRole, "production_resource")
                self.ensure_credit_name(persona.id, credit.creditRole, credit.creditedAs)
                work = audio_works.get(credit.audioWorkId)
                if work:
                    self.add_credit(persona.id, credit.creditRole, url=work.url, title=work.title,
                                    cover_url=work.coverUrl or "", credited_as=credit.creditedAs,
                                    audio_work_id=work.id, source="production_resource")
            for work in external_works.get(resource.id, []):
                if work.creditRole in PRODUCTION_ROLES:
                    self.ensure_role(persona.id, work.creditRole, "production_resource")
                    self.add_credit(persona.id, work.creditRole, url=work.url, title=work.title,
                                    cover_url=work.coverUrl, work_type=work.workType,
                                    credited_as=work.creditedAs, source="production_resource")

        # 2. Names printed in catalog credit lists. Canonical spellings go first so aliases find them.
        names: set[tuple[str, str]] = set()
        for credit in db.query(models.AudioWorkCredit).filter(models.AudioWorkCredit.role.in_(tuple(_SOURCE_ROLE_TO_ROLE))).all():
            if credit.audioWorkId in audio_works and str(credit.creditedAs or "").strip():
                names.add((_SOURCE_ROLE_TO_ROLE[credit.role], credit.creditedAs))
        for role, credited_as in sorted(names, key=lambda item: ((item in CREDIT_NAME_ALIASES), item)):
            if (role, credited_as) in self.credit_names:
                legacy = self._legacy_profile(legacy_credit_resource_id(role, credited_as), enrichments, overrides, links)
                persona = self.personas.get(self.credit_names[(role, credited_as)])
                if persona is not None:
                    self.fill_profile(persona, avatar=legacy["avatar"], bio=legacy["bio"], website=legacy["website"], links=legacy["links"])
                continue
            canonical = CREDIT_NAME_ALIASES.get((role, credited_as), credited_as)
            legacy_id = legacy_credit_resource_id(role, credited_as)
            legacy = self._legacy_profile(legacy_id, enrichments, overrides, links)
            persona_id = self.credit_names.get((role, canonical))
            if persona_id:
                persona = self.personas[persona_id]
                self.fill_profile(persona, avatar=legacy["avatar"], bio=legacy["bio"], website=legacy["website"], links=legacy["links"])
            else:
                persona = self.persona_for(legacy["displayName"] or canonical, avatar=legacy["avatar"], bio=legacy["bio"],
                                           website=legacy["website"], links=legacy["links"])
            self.add_contributors(persona, legacy["contributors"])
            self.ensure_role(persona.id, role, "audio_credit")
            self.ensure_credit_name(persona.id, role, canonical)
            self.ensure_credit_name(persona.id, role, credited_as)
            for work in external_works.get(legacy_id, []):
                if work.creditRole in PRODUCTION_ROLES:
                    self.add_credit(persona.id, work.creditRole, url=work.url, title=work.title,
                                    cover_url=work.coverUrl, work_type=work.workType,
                                    credited_as=work.creditedAs, source="production_resource")

        # 3. External writers with published scripts.
        published_author_ids = {
            row[0] for row in db.query(models.ExternalPublicScript.externalAuthorId).filter(
                models.ExternalPublicScript.status == "published",
                models.ExternalPublicScript.externalAuthorId.isnot(None),
            ).distinct().all()
        }
        page_profiles = {row.authorKey: row for row in db.query(models.ExternalAuthorPageProfile).all()}
        supplements = {row.authorKey: row for row in db.query(models.ExternalAuthorPageSupplement).all()}
        for author in db.query(models.ExternalAuthor).filter(models.ExternalAuthor.isHidden.is_(False)).all():
            if author.id not in published_author_ids:
                continue
            page_profile = page_profiles.get(author.canonicalKey)
            if page_profile and page_profile.isHidden:
                continue
            linked_id = page_profile.linkedPersonaId if page_profile else author.linkedPersonaId
            if linked_id and linked_id in self.personas:
                self.ensure_writer_role(linked_id)
                continue
            supplement = supplements.get(author.canonicalKey)
            extra = dict(supplement.profile) if supplement and isinstance(supplement.profile, dict) else {}
            persona = self.persona_for(
                (page_profile.displayName if page_profile and page_profile.displayName else author.displayName) or author.canonicalKey,
                avatar=(page_profile.avatarUrl if page_profile else "") or author.avatarUrl or "",
                bio=(page_profile.bio if page_profile else "") or author.bio or "",
                website=(page_profile.profileUrl if page_profile else "") or author.profileUrl or extra.get("website") or "",
                links=extra.get("links") or [],
            )
            if supplement and isinstance(supplement.contributors, list):
                self.add_contributors(persona, supplement.contributors)
            author.linkedPersonaId = persona.id
            if page_profile:
                page_profile.linkedPersonaId = persona.id
            self.ensure_writer_role(persona.id)
            self.report.linkedExternalAuthors += 1
        return self.report


def run_identity_convergence(db: Session) -> ConvergenceReport:
    """Apply convergence in the caller's transaction; the caller commits."""
    report = _Converger(db).converge()
    db.flush()
    return report


def converge_and_commit(db: Session) -> ConvergenceReport:
    report = run_identity_convergence(db)
    if report.changed():
        db.commit()
        from routers import public_bundle
        public_bundle.invalidate_public_bundle_cache()
    return report


def run_identity_convergence_on_startup() -> None:
    from database import SessionLocal

    db = SessionLocal()
    try:
        report = converge_and_commit(db)
        if report.changed():
            print(f"[identity-convergence] {report}", flush=True)
    except Exception as error:  # Startup must not fail because of a data problem; the next boot retries.
        db.rollback()
        print(f"[identity-convergence] failed: {error!r}", file=sys.stderr, flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    from database import SessionLocal

    dry_run = "--dry-run" in sys.argv
    session = SessionLocal()
    try:
        result = run_identity_convergence(session)
        if dry_run:
            session.rollback()
        else:
            session.commit()
        print(("[dry-run] " if dry_run else "") + "identity convergence")
        print(f"  new identities ({len(result.createdPersonas)}): {', '.join(result.createdPersonas)}")
        print(f"  merged into an existing identity ({len(result.mergedIntoExisting)}):")
        for line in result.mergedIntoExisting:
            print(f"    {line}")
        print(f"  linked external writers: {result.linkedExternalAuthors}, linked resources: {result.linkedResources}")
        print(f"  roles added: {result.roles}, credit names: {result.creditNames}, credits: {result.credits}")
    finally:
        session.close()
