"""Capture verified public voice actor profiles and concise card descriptions."""

from datetime import datetime, timezone
import json
from pathlib import Path

from scripts.prepare_resource_enrichments import useful_image
from scripts.research_resource_profiles import fetch_metadata


DATA = Path(__file__).parent / "data"
NEW_PROFILES = [
    ("b390731a-e706-4990-98bc-db9b251b8a53", "Aoi Hinamori", "https://www.youtube.com/@AoiHinamoriCh", "台灣吸血鬼護士 VTuber，經營直播與聲音作品。"),
    ("557aa467-0312-4774-850e-99c515881d1b", "小雪Yukichan", "https://www.youtube.com/@yukichanch", "台灣個人勢 VTuber，直播遊戲、歌唱與 ASMR。"),
    ("5d50c406-ae39-4fb0-855b-afcf11160443", "雪之下織雪", "https://www.youtube.com/channel/UCH2dAEECzniZIShBZ50Iujg", "芥川所屬 VTuber，創作 ASMR 與直播內容。"),
    ("41a5b0b3-378f-4056-b5af-50105798e1c6", "洛可洛斯特", "https://www.youtube.com/channel/UCT1kajmUhayQ4QaLlDbK23g", "個人勢 VTuber，喜歡唱歌並擅長聲音模仿。"),
    ("645abb8e-c748-4e0b-814a-ef109655bb43", "灰妲", "https://x.com/DadaRelive", "ReLive 一期生灰鸚鵡 VTuber，參與直播與 ASMR。"),
    ("79b6370e-7bcd-4b01-a269-1615a62cd022", "名雪薇薇", "https://x.com/Nayuki_Vivy", "以歌唱、直播與 ASMR 活動的雪豹 VTuber。"),
    ("2d2b76b5-d09a-4f6f-a77f-37829aa58a59", "赤姬紅葉", "https://x.com/AKAHIMEMOMIJI", "女巫 VTuber，參與音聲演出與直播。"),
    ("ff1fe809-a4ec-404c-93da-2b1f20037946", "指永拷人", "https://x.com/g_sashinaga", "日本聲演，經營 Slame 並參與音聲演出與製作。"),
    ("54c77d05-1062-4e3a-9750-55c186882b63", "周景", "https://www.youtube.com/@ES_ChouChing", "隆中閣成員，以歌唱、直播與聲音演出活動。"),
    ("ad7e39fe-5894-4a71-8d4b-43f457d279d9", "司鳳", "https://www.youtube.com/@ES_Phoenix", "隆中閣成員，經營故事與直播內容。"),
    ("5ca0f485-e5c1-49c1-95dc-e4ce402b9f2c", "葛晨", "https://www.youtube.com/@ES_GeChen", "隆中閣成員，經營故事與直播內容。"),
    ("bfc48025-2801-4f51-b0bb-62fdc86759e4", "露熙妲", "https://www.youtube.com/channel/UC6CpUl2thiDslRorMhd00HA", "VTuber，以直播與 ASMR 活動。"),
    ("520bd575-8952-51c1-a2be-b7140bf3215d", "莉莉Lily", "https://portaly.cc/lilysfantasy520", "聲音創作者，經營 Podcast 與情境音聲作品。"),
    ("0ef644c8-0df3-4f92-9dfe-10782505d7a4", "長毛象邦邦", "https://x.com/elephantbond2", "聲音創作者與 Podcaster，經營女性向情境音聲。"),
]

NEW_EXTRA_LINKS = {
    "雪之下織雪": [("X", "https://x.com/oriyuki_vtuber")],
    "灰妲": [("Linktree", "https://linktr.ee/grayda0105")],
    "名雪薇薇": [("StreetVoice", "https://streetvoice.com/NayukiViVy/about/")],
    "露熙妲": [("X", "https://x.com/Luxida_Reverie")],
}

# Descriptions are short paraphrases of the linked creators' own profiles.
EXISTING_DETAILS = {
    "一介": ("台灣聲演，參與音聲演出及後製。", [("YouTube", "https://www.youtube.com/@voice_1J")]),
    "一条ひらめ": ("日文音聲聲演，經營 monoBlue／Black。", []),
    "刺草ネトル": ("日本聲演，參與商業與同人音聲作品。", []),
    "床貓": ("聲演與 ASMR 創作者，Bedtime Story 被談聲聆成員。", [("Facebook", "https://www.facebook.com/BeddyMiao/")]),
    "慾子燒": ("霓聲工作室聲音演員，參與配音與音聲作品。", []),
    "晚晚": ("配音員與聲音導演，參與音聲及遊戲配音。", []),
    "暮恩": ("VTuber，經營雜談、遊戲與台詞直播。", []),
    "柔依": ("聲演，參與配音與音聲作品。", []),
    "水曜日": ("聲演，參與音聲配音。", []),
    "蓋爾": ("VTuber，經營直播並參與音聲演出。", []),
    "霏筱雨": ("聲演與聲音導演，參與遊戲、音聲與 ASMR。", []),
}


def main():
    original = json.loads((DATA / "voice_actor_avatars_2026-11-10.json").read_text())["avatars"]
    now = int(datetime.now(timezone.utc).timestamp() * 1000)
    profiles = []
    for item in original:
        bio, extra_links = EXISTING_DETAILS[item["name"]]
        profiles.append({**item, "bio": bio, "extraLinks": [
            {"label": label, "url": url} for label, url in extra_links
        ]})
    for persona_id, name, url, bio in NEW_PROFILES:
        metadata = fetch_metadata(url)
        avatar = useful_image(metadata.get("imageUrl", ""))
        if metadata["status"] != "ok" or not avatar or name.casefold() not in metadata["title"].casefold():
            raise ValueError(f"Profile identity/image could not be verified: {name} {url}")
        profiles.append({"personaId": persona_id, "name": name, "avatarUrl": avatar,
                         "profileUrl": url, "sourceUrl": url, "bio": bio,
                         "extraLinks": [{"label": label, "url": link_url}
                                        for label, link_url in NEW_EXTRA_LINKS.get(name, [])],
                         "checkedAt": now})
    profiles.extend([
        {"personaId": "809f8b27-f151-4759-8283-dab3dc2e823f", "name": "安里",
         "bio": "聲演，與葉月共同經營音聲社團。", "extraLinks": [
             {"label": "社團 Facebook", "url": "https://www.facebook.com/AxHxASMR/"}],
         "sourceUrl": "https://www.facebook.com/AxHxASMR/", "checkedAt": now},
        {"personaId": "ff30cc06-e8a7-4db2-830a-9b709eaf764b", "name": "葉月",
         "bio": "聲演，與安里共同經營音聲社團。", "extraLinks": [
             {"label": "社團 Facebook", "url": "https://www.facebook.com/AxHxASMR/"}],
         "sourceUrl": "https://www.facebook.com/AxHxASMR/", "checkedAt": now},
        {"personaId": "d396f326-ceeb-4436-bd91-d8bfc15f15b0", "name": "六条銀",
         "bio": "日本聲演，參與音聲演出並提供聲音樣本。", "extraLinks": [
             {"label": "Twitcast", "url": "https://twitcasting.tv/gin_rokujo"}],
         "sourceUrl": "https://twitcasting.tv/gin_rokujo", "checkedAt": now},
        {"personaId": "5bb81ad7-08eb-4b21-9989-83e59724bf73", "name": "速水理人",
         "bio": "日本聲演，參與音聲作品演出。", "extraLinks": [
             {"label": "Twitcast", "url": "https://twitcasting.tv/hayami_rihito"}],
         "sourceUrl": "https://twitcasting.tv/hayami_rihito", "checkedAt": now},
        {"personaId": "f878d56b-5077-418b-a15c-6755e65f7018", "name": "伊橙/Kurihara Risako",
         "bio": "台灣聲演，參與音聲、遊戲配音與演唱。", "extraLinks": [
             {"label": "X", "url": "https://x.com/kurihara_mikan"}],
         "sourceUrl": "https://x.com/kurihara_mikan", "checkedAt": now},
        {"personaId": "dae719fd-b741-4708-9ec3-ec5420ea7ead", "name": "默吹羽",
         "bio": "聲演與歌唱創作者，參與中文音聲作品。", "extraLinks": [
             {"label": "X", "url": "https://x.com/mugi_sing0729"}],
         "sourceUrl": "https://x.com/mugi_sing0729", "checkedAt": now},
        {"personaId": "8b5853be-8c71-4d30-8697-2868a3ac7488", "name": "古桑",
         "bio": "男性向情境音聲與 Podcast 創作者。", "extraLinks": [
             {"label": "Dcard", "url": "https://www.dcard.tw/@keam1015"}],
         "sourceUrl": "https://www.dcard.tw/@keam1015", "checkedAt": now},
    ])
    profiles.sort(key=lambda item: item["name"])
    target = DATA / "voice_actor_profiles_2026-11-10.json"
    target.write_text(json.dumps({"profiles": profiles}, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {len(profiles)} voice actor profiles")


if __name__ == "__main__":
    main()
