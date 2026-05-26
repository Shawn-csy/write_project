
import io
import zipfile
import sys
import types
from routers import export as export_router

def test_export_all(client):
    headers = {"X-User-ID": "u_export"}
    # Create some scripts
    client.post("/api/scripts", json={"title": "Script1", "content": "Content1"}, headers=headers)
    client.post("/api/scripts", json={"title": "Script2", "content": "Content2", "folder": "/FolderA"}, headers=headers)
    
    response = client.get("/api/export/all", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    
    # Verify zip content
    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        names = z.namelist()
        assert "Script1.fountain" in names
        assert "FolderA/Script2.fountain" in names
        
        s1 = z.read("Script1.fountain").decode("utf-8")
        assert s1 == "Content1"


def test_export_google_docs_prefers_docs_blocks(client, monkeypatch):
    called = {"blocks": False, "fallback": False}

    def fake_blocks(title, docs_blocks, google_access_token, folder_id):
        called["blocks"] = True
        assert title == "T"
        assert isinstance(docs_blocks, list) and len(docs_blocks) == 1
        assert docs_blocks[0]["runs"][0]["text"] == "Hello"
        assert google_access_token == "tok"
        assert folder_id == "folder123"
        return {"documentId": "doc_blocks", "documentUrl": "https://docs.google.com/document/d/doc_blocks/edit", "exportMode": "docs_blocks"}

    def fake_fallback(title, text, rendered_html, google_access_token, folder_id):
        called["fallback"] = True
        return {"documentId": "doc_fallback", "documentUrl": "https://docs.google.com/document/d/doc_fallback/edit", "exportMode": "docx_import_fallback"}

    monkeypatch.setattr(export_router, "_create_google_doc_from_blocks", fake_blocks)
    monkeypatch.setattr(export_router, "_create_google_doc_via_docx_import", fake_fallback)

    res = client.post(
        "/api/export/google-docs",
        headers={"X-User-ID": "u_export"},
        json={
            "title": "T",
            "text": "RAW",
            "google_access_token": "tok",
            "folder_id": "folder123",
            "docs_blocks": [{"runs": [{"text": "Hello", "bold": True}]}],
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["exportMode"] == "docs_blocks"
    assert called["blocks"] is True
    assert called["fallback"] is False


def test_export_google_docs_fallback_without_docs_blocks(client, monkeypatch):
    called = {"blocks": False, "fallback": False}

    def fake_blocks(title, docs_blocks, google_access_token, folder_id):
        called["blocks"] = True
        return {"documentId": "doc_blocks", "documentUrl": "https://docs.google.com/document/d/doc_blocks/edit", "exportMode": "docs_blocks"}

    def fake_fallback(title, text, rendered_html, google_access_token, folder_id):
        called["fallback"] = True
        assert title == "T2"
        assert text == "RAW2"
        assert google_access_token == "tok2"
        assert folder_id is None
        return {"documentId": "doc_fallback", "documentUrl": "https://docs.google.com/document/d/doc_fallback/edit", "exportMode": "docx_import_fallback"}

    monkeypatch.setattr(export_router, "_create_google_doc_from_blocks", fake_blocks)
    monkeypatch.setattr(export_router, "_create_google_doc_via_docx_import", fake_fallback)

    res = client.post(
        "/api/export/google-docs",
        headers={"X-User-ID": "u_export"},
        json={
            "title": "T2",
            "text": "RAW2",
            "google_access_token": "tok2",
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["exportMode"] == "docx_import_fallback"
    assert called["blocks"] is False
    assert called["fallback"] is True


def test_create_google_doc_from_blocks_builds_text_styles(monkeypatch):
    captured = {"requests": None}

    class FakeDocsCreate:
        def execute(self):
            return {"documentId": "doc123"}

    class FakeDocsBatchUpdate:
        def __init__(self, body):
            self.body = body

        def execute(self):
            captured["requests"] = self.body.get("requests", [])
            return {}

    class FakeDocsDocuments:
        def create(self, body):
            assert body["title"] == "Styled"
            return FakeDocsCreate()

        def batchUpdate(self, documentId, body):
            assert documentId == "doc123"
            return FakeDocsBatchUpdate(body)

    class FakeDocsService:
        def documents(self):
            return FakeDocsDocuments()

    class FakeDriveFilesGet:
        def execute(self):
            return {"parents": ["root"]}

    class FakeDriveFilesUpdate:
        def execute(self):
            return {"id": "doc123", "parents": ["folderA"]}

    class FakeDriveFiles:
        def get(self, fileId, fields):
            return FakeDriveFilesGet()

        def update(self, **kwargs):
            return FakeDriveFilesUpdate()

    class FakeDriveService:
        def files(self):
            return FakeDriveFiles()

    def fake_build(service_name, version, credentials):
        if service_name == "docs":
            return FakeDocsService()
        if service_name == "drive":
            return FakeDriveService()
        raise AssertionError("unexpected service")

    class FakeCredentials:
        def __init__(self, token):
            assert token == "tok"

    fake_googleapiclient = types.ModuleType("googleapiclient")
    fake_discovery = types.ModuleType("googleapiclient.discovery")
    fake_discovery.build = fake_build
    fake_googleapiclient.discovery = fake_discovery
    monkeypatch.setitem(sys.modules, "googleapiclient", fake_googleapiclient)
    monkeypatch.setitem(sys.modules, "googleapiclient.discovery", fake_discovery)

    fake_google = types.ModuleType("google")
    fake_google_oauth2 = types.ModuleType("google.oauth2")
    fake_google_oauth2_credentials = types.ModuleType("google.oauth2.credentials")
    fake_google_oauth2_credentials.Credentials = FakeCredentials
    fake_google.oauth2 = fake_google_oauth2
    fake_google_oauth2.credentials = fake_google_oauth2_credentials
    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.oauth2", fake_google_oauth2)
    monkeypatch.setitem(sys.modules, "google.oauth2.credentials", fake_google_oauth2_credentials)

    result = export_router._create_google_doc_from_blocks(
        title="Styled",
        docs_blocks=[
            {"runs": [{"text": "摘要", "bold": True, "italic": True, "color": "#333333"}]},
            {"runs": [{"text": "內容", "color": "#6B966A"}]},
        ],
        google_access_token="tok",
        folder_id="folderA",
    )

    assert result["exportMode"] == "docs_blocks"
    assert captured["requests"] is not None
    style_reqs = [r["updateTextStyle"] for r in captured["requests"] if "updateTextStyle" in r]
    assert any("bold" in req["fields"] and req["textStyle"].get("bold") is True for req in style_reqs)
    assert any("italic" in req["fields"] and req["textStyle"].get("italic") is True for req in style_reqs)
    assert any(
        "foregroundColor" in req["fields"]
        and req["textStyle"].get("foregroundColor", {}).get("color", {}).get("rgbColor") is not None
        for req in style_reqs
    )


def test_create_google_doc_table_uses_table_range_cell_location(monkeypatch):
    captured = {"style_requests": [], "column_requests": []}

    class FakeDocsCreate:
        def execute(self):
            return {"documentId": "doc_table"}

    class FakeDocsGet:
        def execute(self):
            idx = 2
            rows = []
            for _row in range(2):
                cells = []
                for _col in range(2):
                    cells.append({"content": [{"startIndex": idx, "paragraph": {}}]})
                    idx += 10
                rows.append({"tableCells": cells})
            return {"body": {"content": [{"startIndex": 5, "table": {"tableRows": rows}}]}}

    class FakeDocsBatchUpdate:
        def __init__(self, body):
            self.body = body

        def execute(self):
            for request in self.body.get("requests", []):
                if "updateTableCellStyle" in request:
                    captured["style_requests"].append(request["updateTableCellStyle"])
                if "updateTableColumnProperties" in request:
                    captured["column_requests"].append(request["updateTableColumnProperties"])
            return {}

    class FakeDocsDocuments:
        def create(self, body):
            return FakeDocsCreate()

        def get(self, documentId):
            assert documentId == "doc_table"
            return FakeDocsGet()

        def batchUpdate(self, documentId, body):
            assert documentId == "doc_table"
            return FakeDocsBatchUpdate(body)

    class FakeDocsService:
        def documents(self):
            return FakeDocsDocuments()

    class FakeDriveService:
        def files(self):
            raise AssertionError("drive should not be used without folder")

    def fake_build(service_name, version, credentials):
        if service_name == "docs":
            return FakeDocsService()
        if service_name == "drive":
            return FakeDriveService()
        raise AssertionError("unexpected service")

    class FakeCredentials:
        def __init__(self, token):
            assert token == "tok"

    fake_googleapiclient = types.ModuleType("googleapiclient")
    fake_discovery = types.ModuleType("googleapiclient.discovery")
    fake_discovery.build = fake_build
    fake_googleapiclient.discovery = fake_discovery
    monkeypatch.setitem(sys.modules, "googleapiclient", fake_googleapiclient)
    monkeypatch.setitem(sys.modules, "googleapiclient.discovery", fake_discovery)

    fake_google = types.ModuleType("google")
    fake_google_oauth2 = types.ModuleType("google.oauth2")
    fake_google_oauth2_credentials = types.ModuleType("google.oauth2.credentials")
    fake_google_oauth2_credentials.Credentials = FakeCredentials
    fake_google.oauth2 = fake_google_oauth2
    fake_google_oauth2.credentials = fake_google_oauth2_credentials
    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.oauth2", fake_google_oauth2)
    monkeypatch.setitem(sys.modules, "google.oauth2.credentials", fake_google_oauth2_credentials)

    result = export_router._create_google_doc_table(
        title="Table",
        columns=["行號", "主對白"],
        rows=[["1", "內容"]],
        cell_styles=[[None, {"backgroundColor": "#ffeeaa", "paddingTop": 6, "paddingRight": 12, "paddingBottom": 6, "paddingLeft": 12}]],
        cell_runs=[[[{"text": "1"}], [{"text": "內容", "bold": True}]]],
        table_layout={
            "columnWidths": [28, 72],
            "defaultCellStyle": {"paddingTop": 4, "paddingRight": 8, "paddingBottom": 4, "paddingLeft": 8},
        },
        google_access_token="tok",
        folder_id=None,
    )

    assert result["exportMode"] == "table_v2"
    assert len(captured["column_requests"]) == 2
    assert captured["column_requests"][0]["tableStartLocation"] == {"index": 5}
    assert captured["column_requests"][0]["columnIndices"] == [0]
    assert captured["column_requests"][0]["tableColumnProperties"]["widthType"] == "FIXED_WIDTH"
    assert len(captured["style_requests"]) == 2
    default_style_request = next(req for req in captured["style_requests"] if "tableStartLocation" in req)
    assert default_style_request["tableStartLocation"] == {"index": 5}
    assert default_style_request["tableCellStyle"]["paddingLeft"] == {"magnitude": 6.0, "unit": "PT"}
    style_request = next(req for req in captured["style_requests"] if "tableRange" in req)
    assert "tableStartLocation" not in style_request
    assert style_request["tableRange"]["tableCellLocation"] == {
        "tableStartLocation": {"index": 5},
        "rowIndex": 1,
        "columnIndex": 1,
    }
    assert style_request["tableCellStyle"]["paddingLeft"] == {"magnitude": 9.0, "unit": "PT"}
