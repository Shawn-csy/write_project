"""Candidate checks shared by catalog seed and work importers."""

from itertools import chain
import unicodedata
from urllib.parse import urlparse

from models import Persona, PersonaCredit, PersonaCreditName, PublicAudioWorkSubmission


def identity_name_key(name):
    normalized = unicodedata.normalize("NFKC", name or "").casefold()
    return "".join(char for char in normalized if char.isalnum())


def profile_url_key(url):
    if not isinstance(url, str):
        return None
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").removeprefix("www.")
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not host:
        return None
    path = parsed.path.rstrip("/")
    if host in {"twitter.com", "x.com"}:
        return ("x.com", path.casefold(), "")
    return (host, path, parsed.query)


def persona_profile_urls(person):
    return [person.website, *(link.get("url") for link in (person.links or [])
                              if isinstance(link, dict))]


def catalog_credit_names(db):
    return [
        *db.query(PersonaCreditName.creditedAs, PersonaCreditName.personaId).all(),
        *db.query(PersonaCredit.creditedAs, PersonaCredit.personaId).distinct().all(),
    ]


def identity_candidates(profile, personas, credit_names):
    """A name match is a review candidate, not permission to link a credit."""
    key = identity_name_key(profile["displayName"])
    names = chain(
        ((person.displayName, person.id) for person in personas),
        ((alias.creditedAs, alias.personaId) for alias in credit_names),
    )
    proposed_id = profile.get("id")
    matches = {pid for name, pid in names
               if key and pid != proposed_id and identity_name_key(name) == key}
    website = profile_url_key(profile.get("website"))
    if website:
        matches.update(person.id for person in personas if person.id != proposed_id
                       and any(profile_url_key(url) == website for url in persona_profile_urls(person)))
    return sorted(matches)


def require_new_catalog_identity(db, *, display_name, website=None, persona_id=None):
    """Stop a legacy importer before it can create a competing card."""
    db.flush()
    matches = identity_candidates(
        {"id": persona_id, "displayName": display_name, "website": website},
        db.query(Persona).all(), catalog_credit_names(db),
    )
    if matches:
        raise ValueError(f"Review identity for {display_name!r} before creating a card: {', '.join(matches)}")


def existing_catalog_actors(db, name, *, organization_id, website=None):
    """Reuse a legacy ID only when the catalog already links this credit or the account matches."""
    db.flush()
    people = {person.id: person for person in db.query(Persona).all()}
    candidates = identity_candidates(
        {"displayName": name, "website": website}, people.values(), catalog_credit_names(db),
    )
    if not candidates:
        return []
    account = profile_url_key(website)
    accounts = {pid for pid in candidates if account and
                any(profile_url_key(url) == account for url in persona_profile_urls(people[pid]))}
    works = db.query(PublicAudioWorkSubmission).filter_by(organizationId=organization_id, status="approved").all()
    linked = {credit.personaId for credit in db.query(PersonaCredit).filter(
        PersonaCredit.role == "voice_actor", PersonaCredit.creditedAs == name,
        PersonaCredit.audioWorkId.in_([work.id for work in works]),
    )} if works else set()
    linked.update(pid for work in works for pid in (work.voiceActorIds or [])
                  if pid in people and people[pid].displayName == name)
    confirmed = accounts or (set(candidates) & linked)
    if len(confirmed) != 1:
        raise ValueError(f"Review identity for {name!r} before importing: {', '.join(candidates)}")
    return [people[next(iter(confirmed))]]
