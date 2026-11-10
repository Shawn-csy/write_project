import json

from scripts import check_audio_work_releases as discovery


def test_title_matching_handles_minor_catalog_variations():
    assert discovery.titles_match(
        discovery.normalize_title("【搜刮民財】精液稅務官強制搾取【中文短篇音聲】"),
        discovery.normalize_title("【搜刮民財】精液稅務官強○搾取【中文短篇音聲】"),
    )
    assert discovery.titles_match(
        discovery.normalize_title("超級廉價航空機上服務"),
        discovery.normalize_title("【空中紓壓】超級廉價航空機上服務【中文短篇音聲】"),
    )


def test_portaly_reads_subpages_and_product_labels(monkeypatch):
    data = {
        "props": {"pageProps": {"data": {
            "blocks": [],
            "pages": {"one": {"title": "作品", "blocks": {"a": {
                "items": [{"linkId": "product", "label": "作品名稱"}]
            }}}},
            "links": {"product": {"url": "https://www.myacg.com.tw/goods_detail.php?gid=1234567"}},
        }}}
    }
    html = '<script id="__NEXT_DATA__" type="application/json">' + json.dumps(data) + '</script>'
    monkeypatch.setattr(discovery, "get_text", lambda _url: html)
    items = discovery.portaly_items("https://example.com")
    assert len(items) == 1
    assert items[0]["key"] == "official:1234567"
    assert "作品名稱" in items[0]["title"]


def test_catalog_match_by_product_id_or_title():
    existing = {"urls": set(), "tokens": {"RJ01234567"}, "titles": {discovery.normalize_title("作品名稱")}}
    assert discovery.is_in_catalog({"url": "https://dlaf.jp/example/RJ01234567.html", "title": "別名"}, existing)
    assert discovery.is_in_catalog({"url": "https://cxc.today/item/1", "title": "作品名稱"}, existing)
