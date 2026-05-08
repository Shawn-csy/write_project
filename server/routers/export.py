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
        from docx.shared import Pt
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
