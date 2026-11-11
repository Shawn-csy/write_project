"""Add the sourced SenSonus recording-studio listing to the dev catalog.

Sources:
- Official Facebook page: https://www.facebook.com/p/%E6%84%9F%E8%81%B2%E9%8C%84%E9%9F%B3%E5%AE%A4-SenSonus-Records-61565240793445/
- Studio booking form: https://docs.google.com/forms/d/e/1FAIpQLSc2aos8iBLagxkoXrr6rp5bskaLY1r0LsM14b-cNKGAkYsh7A/viewform
- Each Steam soundtrack page below credits SenSonus Records / 感聲錄音室.

Run from /app with ``python -m scripts.import_sensonus_resource``.
"""

import os
import time

from database import SessionLocal
from models import (ProductionResource, ProductionResourceEnrichment,
                    ProductionResourceExternalWork, ProductionResourceLink)


RESOURCE_ID = "sensonus-records"
NAME = "感聲錄音室 SenSonus Records"
FACEBOOK = "https://www.facebook.com/p/%E6%84%9F%E8%81%B2%E9%8C%84%E9%9F%B3%E5%AE%A4-SenSonus-Records-61565240793445/"
BOOKING = "https://docs.google.com/forms/d/e/1FAIpQLSc2aos8iBLagxkoXrr6rp5bskaLY1r0LsM14b-cNKGAkYsh7A/viewform"
SUMMARY = "新北市的錄音室，提供錄音、配唱、聲音指導，以及遊戲配樂與主題曲製作服務。"
WORKS = (
    ("3033250", "臺灣戀愛物語⁵ Soundtrack",
     "https://store.steampowered.com/app/3033250/Taiwan_Love_Story5_Soundtrack/",
     "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3033250/4f892b1c31aa22aa186b38134cdd124fd35e34ab/capsule_616x353_tchinese.jpg"),
    ("3699300", "異世界情趣用品店 Soundtrack",
     "https://store.steampowered.com/app/3699300/Isekai_Sex_Boutique_Soundtrack/",
     "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3699300/7584e7a9ebb181e1730cd82c0e14bb46f3396191/capsule_616x353_tchinese.jpg"),
    ("4193130", "29歲的人妻想成為職業 coser 是否搞錯了什麼？ Soundtrack",
     "https://store.steampowered.com/app/4193130/My_Wife_Wants_to_Be_a_Professional_Cosplayer_Soundtrack/",
     "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4193130/7f557271a55b28b211260b34570e4be4a20e2b7d/capsule_616x353.jpg"),
    ("5123430", "星的歸還者 Soundtrack",
     "https://store.steampowered.com/app/5123430/The_Starborn_Return_Soundtrack/",
     "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5123430/effcf86aec96b7e613dcf560dedc590280259ba5/capsule_616x353_tchinese.jpg"),
)


def main() -> None:
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to import outside the dev database")
    now = int(time.time() * 1000)
    with SessionLocal() as db:
        duplicate = db.query(ProductionResource).filter(ProductionResource.name == NAME,
                                                        ProductionResource.id != RESOURCE_ID).first()
        if duplicate:
            raise SystemExit(f"Resource already exists under {duplicate.id}")
        resource = db.get(ProductionResource, RESOURCE_ID)
        if resource is None:
            resource = ProductionResource(id=RESOURCE_ID, createdAt=now)
            db.add(resource)
        resource.name = NAME
        resource.categories = ["recording_studio"]
        resource.summary = SUMMARY
        resource.websiteUrl = FACEBOOK
        resource.sourceUrl = FACEBOOK
        resource.status = "published"
        resource.reviewedAt = now
        resource.updatedAt = now

        enrichment = db.get(ProductionResourceEnrichment, RESOURCE_ID)
        if enrichment is None:
            enrichment = ProductionResourceEnrichment(id=RESOURCE_ID)
            db.add(enrichment)
        enrichment.profileUrl = FACEBOOK
        enrichment.profileLabel = "Facebook"
        enrichment.avatarUrl = "/resources/sensonus-records.jpg"
        enrichment.bio = SUMMARY
        enrichment.sourceUrl = FACEBOOK
        enrichment.checkedAt = now

        booking = db.get(ProductionResourceLink, "sensonus-booking")
        if booking is None:
            booking = ProductionResourceLink(id="sensonus-booking", resourceId=RESOURCE_ID)
            db.add(booking)
        booking.label = "錄音室預約表單"
        booking.url = BOOKING
        booking.sourceUrl = BOOKING
        booking.checkedAt = now

        for steam_id, title, url, cover_url in WORKS:
            work = db.get(ProductionResourceExternalWork, f"sensonus-steam-{steam_id}")
            if work is None:
                work = ProductionResourceExternalWork(id=f"sensonus-steam-{steam_id}",
                                                      resourceId=RESOURCE_ID, createdAt=now)
                db.add(work)
            work.title = title
            work.url = url
            work.coverUrl = cover_url
            work.workType = "audio"
            work.creditRole = "recording_studio"
            work.creditedAs = NAME
        db.commit()
        from services.identity_convergence import converge_and_commit
        converge_and_commit(db)
    print(f"Published {NAME} with {len(WORKS)} sourced works")


if __name__ == "__main__":
    main()
