"""Classification completeness shared by live updates and startup backfill."""

# Accept existing legacy tags as well as the tags currently offered by Studio.
AUDIENCE_TAG_GROUP = {"全年齡", "青少年", "成人", "親子", "一般向", "男性向", "女性向", "兒童", "全性向"}
RATING_TAG_GROUP = {"普遍級", "保護級", "輔導級", "限制級", "G", "PG", "PG-13", "R", "NC-17", "一般", "R-18", "r18", "一般內容", "全年齡向", "成人向"}


def classification_complete(audience, rating, tag_names):
    names = {str(name or "").strip().casefold() for name in tag_names}
    return (
        bool(str(audience or "").strip()) or bool(names.intersection(name.casefold() for name in AUDIENCE_TAG_GROUP)),
        bool(str(rating or "").strip()) or bool(names.intersection(name.casefold() for name in RATING_TAG_GROUP)),
    )
