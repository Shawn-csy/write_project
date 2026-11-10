"""Link the Dev audio persona to the same creator's imported CxC scripts."""

import os
import time
import uuid

from database import SessionLocal
from models import ExternalAuthor, ExternalAuthorPageProfile, ExternalPublicScript, Persona, PersonaRole


PERSONA_ID = "f878d56b-5077-418b-a15c-6755e65f7018"
AUTHOR_ID = "030a99eb-f92e-4258-9d84-df4c158c0d3f"
AUTHOR_KEY = "橘子‧伊橙//ㄐㄗです"
SOCIAL_URL = "https://x.com/kurihara_mikan"
CXC_URL = "https://cxc.today/@kurihara_risako"


def main():
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to link identities outside the dev database")
    now = int(time.time() * 1000)
    with SessionLocal() as db:
        persona = db.get(Persona, PERSONA_ID)
        author = db.get(ExternalAuthor, AUTHOR_ID)
        if not persona or persona.ownerId or persona.displayName != "伊橙/Kurihara Risako":
            raise ValueError("Expected unclaimed audio persona is missing")
        if not author or author.canonicalKey != AUTHOR_KEY or author.profileUrl != SOCIAL_URL:
            raise ValueError("CxC author identity does not match the verified social profile")
        if author.linkedPersonaId not in (None, PERSONA_ID):
            raise ValueError("CxC author is linked to another identity")
        scripts = db.query(ExternalPublicScript).filter_by(externalAuthorId=AUTHOR_ID, status="published").all()
        if len(scripts) != 2 or any(script.authorKey != AUTHOR_KEY for script in scripts):
            raise ValueError("Expected two published CxC scripts for this author")

        author.linkedPersonaId = PERSONA_ID
        author.updatedAt = now
        profile = db.get(ExternalAuthorPageProfile, AUTHOR_KEY)
        if profile and profile.linkedPersonaId not in (None, PERSONA_ID):
            raise ValueError("CxC profile is linked to another identity")
        if not profile:
            profile = ExternalAuthorPageProfile(
                authorKey=AUTHOR_KEY, displayName=author.displayName, bio=author.bio,
                profileUrl=author.profileUrl, avatarUrl=author.avatarUrl,
                linkedPersonaId=PERSONA_ID, isHidden=author.isHidden,
                createdAt=now, updatedAt=now,
            )
            db.add(profile)
        else:
            profile.linkedPersonaId = PERSONA_ID
            profile.updatedAt = now

        role = db.query(PersonaRole).filter_by(personaId=PERSONA_ID, role="scriptwriter").first()
        if not role:
            db.add(PersonaRole(id=str(uuid.uuid4()), personaId=PERSONA_ID,
                               role="scriptwriter", isVisible=True,
                               sourceTypes=["external_script"], profile={},
                               createdAt=now, updatedAt=now))
        elif "external_script" not in (role.sourceTypes or []):
            role.sourceTypes = [*(role.sourceTypes or []), "external_script"]
            role.updatedAt = now

        if not persona.avatar and author.avatarUrl:
            persona.avatar = author.avatarUrl
        links = list(persona.links) if isinstance(persona.links, list) else []
        if not any(isinstance(link, dict) and link.get("url") == CXC_URL for link in links):
            persona.links = [*links, {"label": "CxC", "url": CXC_URL}]
        persona.updatedAt = now
        db.commit()
        print(f"Linked {persona.displayName} to {len(scripts)} CxC scripts")


if __name__ == "__main__":
    main()
