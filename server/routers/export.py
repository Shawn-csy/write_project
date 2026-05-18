from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import io

from dependencies import get_current_user_id

router = APIRouter(prefix="/api/export", tags=["export"])


# ── Request schemas ────────────────────────────────────────────────────────────

class ExportLine(BaseModel):
    line: int
    text: str

class ScriptXlsxRequest(BaseModel):
    title: Optional[str] = "script"
    rows: List[ExportLine]

class ScriptDocxRequest(BaseModel):
    title: Optional[str] = "script"
    text: str

class ScriptGoogleDocsRequest(BaseModel):
    title: Optional[str] = "script"
    text: str
    rendered_html: Optional[str] = None
    folder_id: Optional[str] = None
    google_access_token: str
    docs_blocks: Optional[List[dict]] = None

class ReportRow(BaseModel):
    category: str
    content: str
    line: str

class ReportXlsxRequest(BaseModel):
    title: Optional[str] = "script_report"
    columns: List[str]
    rows: List[ReportRow]

class ReportDocxRequest(BaseModel):
    title: Optional[str] = "script_report"
    doc_title: Optional[str] = "統計報表"
    columns: List[str]
    rows: List[ReportRow]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_filename(name: str, ext: str) -> str:
    safe = "".join(c for c in (name or "script") if c.isalnum() or c in "-_ ")
    return f"{safe or 'script'}.{ext}"


def _build_xlsx(columns: List[str], data_rows: list) -> bytes:
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl not installed")

    wb = openpyxl.Workbook()
    ws = wb.active

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(fill_type="solid", fgColor="111827")

    for col_idx, col_name in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = header_font
        cell.fill = header_fill

    for row_idx, row in enumerate(data_rows, start=2):
        for col_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.alignment = Alignment(wrap_text=True, vertical="top")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


def _build_docx_from_html(title: str, text: str) -> bytes:
    try:
        from docx import Document
        from docx.shared import RGBColor
    except ImportError:
        raise HTTPException(status_code=500, detail="python-docx not installed")

    doc = Document()
    doc.add_heading(title, level=1)
    for line in text.split("\n"):
        doc.add_paragraph(line)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


def _parse_css_flags(style_attr: str) -> dict:
    style = (style_attr or "").lower()
    color = None
    if "color:" in style:
        try:
            part = style.split("color:", 1)[1].split(";", 1)[0].strip()
            if part.startswith("#") and len(part) == 7:
                color = part[1:].upper()
            elif part.startswith("rgb(") and part.endswith(")"):
                nums = [int(x.strip()) for x in part[4:-1].split(",")[:3]]
                if len(nums) == 3:
                    color = "".join(f"{max(0, min(255, n)):02X}" for n in nums)
        except Exception:
            color = None
    return {
        "bold": ("font-weight:bold" in style) or ("font-weight:700" in style) or ("font-weight:800" in style) or ("font-weight:900" in style),
        "italic": "font-style:italic" in style,
        "underline": "text-decoration:underline" in style or "text-decoration-line:underline" in style,
        "color": color,
    }


def _add_styled_runs(paragraph, node, parent_style):
    from bs4 import NavigableString, Tag
    from docx.shared import RGBColor

    if isinstance(node, NavigableString):
        text = str(node)
        if not text:
            return
        run = paragraph.add_run(text)
        run.bold = bool(parent_style.get("bold"))
        run.italic = bool(parent_style.get("italic"))
        run.underline = bool(parent_style.get("underline"))
        color = parent_style.get("color")
        if color:
            run.font.color.rgb = RGBColor.from_string(color)
        return

    if not isinstance(node, Tag):
        return

    next_style = dict(parent_style)
    tag_name = (node.name or "").lower()
    if tag_name in {"strong", "b"}:
        next_style["bold"] = True
    if tag_name in {"em", "i"}:
        next_style["italic"] = True
    if tag_name in {"u"}:
        next_style["underline"] = True

    inline_style = _parse_css_flags(node.attrs.get("style", ""))
    if inline_style.get("bold"):
        next_style["bold"] = True
    if inline_style.get("italic"):
        next_style["italic"] = True
    if inline_style.get("underline"):
        next_style["underline"] = True
    if inline_style.get("color"):
        next_style["color"] = inline_style["color"]

    for child in node.children:
        _add_styled_runs(paragraph, child, next_style)


def _build_docx_from_rendered_html(title: str, rendered_html: str, fallback_text: str = "") -> bytes:
    try:
        from docx import Document
        from bs4 import BeautifulSoup
    except ImportError:
        return _build_docx_from_html(title, fallback_text)

    doc = Document()
    doc.add_heading(title, level=1)

    html = rendered_html or ""
    if not html.strip():
        for line in (fallback_text or "").split("\n"):
            doc.add_paragraph(line)
    else:
        soup = BeautifulSoup(html, "html.parser")
        lines = soup.select(".script-line")
        if not lines:
            lines = soup.find_all(["p", "div", "li"])

        if lines:
            for line in lines:
                para = doc.add_paragraph()
                _add_styled_runs(para, line, {"bold": False, "italic": False, "underline": False, "color": None})
        else:
            plain = soup.get_text("\n")
            for line in plain.split("\n"):
                doc.add_paragraph(line)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


def _create_google_doc_via_docx_import(
    title: str,
    text: str,
    rendered_html: Optional[str],
    google_access_token: str,
    folder_id: Optional[str],
) -> dict:
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        from googleapiclient.http import MediaIoBaseUpload
    except ImportError:
        raise HTTPException(status_code=500, detail="google-api-python-client not installed")

    creds = Credentials(token=google_access_token)
    drive_service = build("drive", "v3", credentials=creds)
    docx_bytes = _build_docx_from_rendered_html(title or "Script", rendered_html or "", text or "")
    media = MediaIoBaseUpload(
        io.BytesIO(docx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        resumable=False,
    )

    clean_folder_id = (folder_id or "").strip()
    metadata = {
        "name": title or "Script",
        "mimeType": "application/vnd.google-apps.document",
    }
    if clean_folder_id:
        metadata["parents"] = [clean_folder_id]

    created = drive_service.files().create(
        body=metadata,
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    document_id = created.get("id")
    if not document_id:
        raise HTTPException(status_code=500, detail="Failed to create Google Doc from DOCX import")

    return {
        "documentId": document_id,
        "documentUrl": f"https://docs.google.com/document/d/{document_id}/edit",
        "exportMode": "docx_import_fallback",
    }


def _hex_to_rgb(color_hex: str) -> Optional[dict]:
    raw = str(color_hex or "").strip().lstrip("#")
    if len(raw) != 6:
        return None
    try:
        r = int(raw[0:2], 16) / 255.0
        g = int(raw[2:4], 16) / 255.0
        b = int(raw[4:6], 16) / 255.0
        return {"red": r, "green": g, "blue": b}
    except Exception:
        return None


def _create_google_doc_from_blocks(
    title: str,
    docs_blocks: List[dict],
    google_access_token: str,
    folder_id: Optional[str],
) -> dict:
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
    except ImportError:
        raise HTTPException(status_code=500, detail="google-api-python-client not installed")

    creds = Credentials(token=google_access_token)
    docs_service = build("docs", "v1", credentials=creds)
    drive_service = build("drive", "v3", credentials=creds)

    doc = docs_service.documents().create(body={"title": title or "Script"}).execute()
    document_id = doc.get("documentId")
    if not document_id:
        raise HTTPException(status_code=500, detail="Failed to create Google Doc")

    insert_chunks: List[str] = []
    style_requests: List[dict] = []
    cursor = 1
    for block in docs_blocks or []:
      runs = block.get("runs") if isinstance(block, dict) else None
      if not isinstance(runs, list) or len(runs) == 0:
          insert_chunks.append("\n")
          cursor += 1
          continue

      for run in runs:
          if not isinstance(run, dict):
              continue
          text = str(run.get("text", ""))
          if not text:
              continue
          start = cursor
          end = start + len(text)
          insert_chunks.append(text)
          fields: List[str] = []
          style: dict = {}
          if run.get("bold"):
              style["bold"] = True
              fields.append("bold")
          if run.get("italic"):
              style["italic"] = True
              fields.append("italic")
          if run.get("underline"):
              style["underline"] = True
              fields.append("underline")
          rgb = _hex_to_rgb(str(run.get("color", "")))
          if rgb:
              style["foregroundColor"] = {"color": {"rgbColor": rgb}}
              fields.append("foregroundColor")
          if fields:
              style_requests.append({
                  "updateTextStyle": {
                      "range": {"startIndex": start, "endIndex": end},
                      "textStyle": style,
                      "fields": ",".join(fields),
                  }
              })
          cursor = end
      insert_chunks.append("\n")
      cursor += 1

    all_text = "".join(insert_chunks) or "\n"
    requests = [{"insertText": {"location": {"index": 1}, "text": all_text}}]
    requests.extend(style_requests)
    docs_service.documents().batchUpdate(
        documentId=document_id,
        body={"requests": requests},
    ).execute()

    clean_folder_id = (folder_id or "").strip()
    if clean_folder_id:
        file_meta = drive_service.files().get(fileId=document_id, fields="parents").execute()
        previous_parents = ",".join(file_meta.get("parents", []))
        drive_service.files().update(
            fileId=document_id,
            addParents=clean_folder_id,
            removeParents=previous_parents or None,
            fields="id, parents",
            supportsAllDrives=True,
        ).execute()

    return {
        "documentId": document_id,
        "documentUrl": f"https://docs.google.com/document/d/{document_id}/edit",
        "exportMode": "docs_blocks",
    }


def _build_report_docx(doc_title: str, columns: List[str], rows: List[ReportRow]) -> bytes:
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
    except ImportError:
        raise HTTPException(status_code=500, detail="python-docx not installed")

    doc = Document()
    doc.add_heading(doc_title, level=1)
    doc.add_paragraph(f"共 {len(rows)} 筆資料")

    table = doc.add_table(rows=1 + len(rows), cols=len(columns))
    table.style = "Table Grid"

    hdr_cells = table.rows[0].cells
    for i, col in enumerate(columns):
        hdr_cells[i].text = col
        run = hdr_cells[i].paragraphs[0].runs[0]
        run.bold = True

    for row_idx, row in enumerate(rows, start=1):
        cells = table.rows[row_idx].cells
        cells[0].text = row.category
        cells[1].text = row.content
        cells[2].text = str(row.line)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/xlsx")
async def export_script_xlsx(
    req: ScriptXlsxRequest,
    _uid: str = Depends(get_current_user_id),
):
    columns = ["行號", "內容"]
    data_rows = [[r.line, r.text] for r in req.rows]
    xlsx_bytes = _build_xlsx(columns, data_rows)
    filename = _safe_filename(req.title, "xlsx")
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/docx")
async def export_script_docx(
    req: ScriptDocxRequest,
    _uid: str = Depends(get_current_user_id),
):
    docx_bytes = _build_docx_from_html(req.title or "Script", req.text)
    filename = _safe_filename(req.title, "docx")
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/google-docs")
async def export_script_google_docs(
    req: ScriptGoogleDocsRequest,
    _uid: str = Depends(get_current_user_id),
):
    try:
        if isinstance(req.docs_blocks, list) and len(req.docs_blocks) > 0:
            return _create_google_doc_from_blocks(
                title=req.title or "Script",
                docs_blocks=req.docs_blocks,
                google_access_token=req.google_access_token,
                folder_id=req.folder_id,
            )
        return _create_google_doc_via_docx_import(
            title=req.title or "Script",
            text=req.text,
            rendered_html=req.rendered_html,
            google_access_token=req.google_access_token,
            folder_id=req.folder_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Docs export failed: {e}")


@router.post("/report/xlsx")
async def export_report_xlsx(
    req: ReportXlsxRequest,
    _uid: str = Depends(get_current_user_id),
):
    data_rows = [[r.category, r.content, r.line] for r in req.rows]
    xlsx_bytes = _build_xlsx(req.columns, data_rows)
    filename = _safe_filename(req.title, "xlsx")
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/report/docx")
async def export_report_docx(
    req: ReportDocxRequest,
    _uid: str = Depends(get_current_user_id),
):
    docx_bytes = _build_report_docx(req.doc_title or req.title or "報表", req.columns, req.rows)
    filename = _safe_filename(req.title, "docx")
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
