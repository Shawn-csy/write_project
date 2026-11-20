import io
import re
from typing import Literal

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Twips
from pydantic import BaseModel, Field


class ProductionTextStyle(BaseModel):
    color: str | None = Field(default=None, pattern=r"^#?[a-fA-F0-9]{6}$")
    font: str | None = Field(default=None, max_length=128, pattern=r"^[^\x00-\x1f\ufffe\uffff]+$")
    bold: bool | None = None


class ProductionTextRun(BaseModel):
    text: str
    style: ProductionTextStyle | None = None


class ProductionScriptRow(BaseModel):
    label: str
    text: str
    kind: Literal["speech", "cue", "position", "pause"]
    style: ProductionTextStyle | None = None
    labelStyle: ProductionTextStyle | None = None
    cueTarget: Literal["continuousEffect", "background"] | None = None
    runs: list[ProductionTextRun] | None = None


DetailRow = tuple[str, str]


class ProductionScriptChapter(BaseModel):
    heading: str
    style: ProductionTextStyle | None = None
    details: list[DetailRow] = Field(default_factory=list)
    rows: list[ProductionScriptRow] = Field(default_factory=list)


class ProductionScriptRequest(BaseModel):
    title: str
    author: str = ""
    rating: str = ""
    work: list[DetailRow] = Field(default_factory=list)
    characters: list[DetailRow] = Field(default_factory=list)
    chapters: list[ProductionScriptChapter] = Field(default_factory=list)


LEGEND = (
    ("角色名", "台詞（語氣等指示）"),
    ("", "（▼整段指示）"),
    ("", "（空一行表示停頓）"),
    ("", "（＊需要聲優表演的效果音，秒數／次數）"),
    ("", "【後製效果】"),
    ("#SE", "單獨效果音"),
    ("@", "位置指示"),
    (">>SE", "持續效果音開頭＜總長度＞"),
    ("><SE", "持續效果音中途指示"),
    ("<<SE", "持續效果音結束"),
    ("//BG", "背景音開頭＜總長度＞"),
    ("/\\BG", "背景音中途指示"),
    ("\\\\BG", "背景音結束"),
)

TITLE_FILL = "DEEBF6"
POSITION_FILL = "E7E6E6"
CONTINUOUS_EFFECT_FILL = "FFF2CC"
BACKGROUND_FILL = "E2EFD9"
EFFECT_SYMBOLS = {">>SE", "><SE", "<<SE"}
BACKGROUND_SYMBOLS = {"//BG", "/\\BG", "\\\\BG"}
WIDTHS = (1357, 8419)
_INVALID_XML = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]")
_INLINE_CUES = re.compile(
    r"(?P<position>[（(][@＠][^（）()、，,\n]+[）)]|(?<=[（(])[@＠][^（）()、，,\n]+)"
    r"|(?P<post>【[^【】\n]+】)"
)


def _text(text: str) -> str:
    return _INVALID_XML.sub("", text)


def _table(document, widths=WIDTHS):
    table = document.add_table(rows=0, cols=len(widths))
    table.autofit = False
    table.style = "Table Grid"
    properties = table._tbl.tblPr
    table_width = properties.find(qn("w:tblW"))
    table_width.set(qn("w:type"), "dxa")
    table_width.set(qn("w:w"), str(sum(widths)))
    properties.insert_element_before(_element("tblInd", w="108", type="dxa"), "w:tblLayout")
    margins = _element("tblCellMar")
    # A small top inset keeps CJK fallback fonts clear of the rules.
    for edge, width in (("top", "30"), ("left", "108"), ("bottom", "0"), ("right", "108")):
        margins.append(_element(edge, w=width, type="dxa"))
    properties.insert_element_before(margins, "w:tblLook")
    for column, width in zip(table.columns, widths):
        column.width = Twips(width)
    return table


def _row(table):
    row = table.add_row()
    row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
    return row.cells


def _element(tag, **attributes):
    element = OxmlElement(f"w:{tag}")
    for key, value in attributes.items():
        element.set(qn(f"w:{key}"), value)
    return element


def _bottom_rule(paragraph):
    borders = _element("pBdr")
    borders.append(_element("bottom", val="single", color="000000", sz="6", space="1"))
    paragraph._p.get_or_add_pPr().insert_element_before(borders, "w:spacing", "w:ind", "w:jc")


def _cell(cell, text, *, bold=False, fill=None, color=None, align=None, keep_next=False, size=None,
          border=False, inline_cues=False, font=None, style=None, runs=None):
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    properties = cell._tc.get_or_add_tcPr()
    if border:
        borders = _element("tcBorders")
        borders.append(_element("bottom", val="single", color="808080", sz="12", space="0"))
        properties.insert_element_before(borders, "w:shd", "w:vAlign")
    if fill:
        properties.insert_element_before(_element("shd", val="clear", fill=fill), "w:vAlign")
    paragraph = cell.paragraphs[0]
    if align is not None:
        paragraph.alignment = align
    paragraph.paragraph_format.keep_with_next = keep_next

    def add_run(fragment, *, run_style, run_color=color, run_fill=None):
        if not fragment:
            return
        run = paragraph.add_run(fragment)
        run.bold = run_style.bold if run_style and run_style.bold is not None else bold
        if run_style and run_style.color:
            run_color = run_style.color.lstrip("#")
        if run_color:
            run.font.color.rgb = RGBColor.from_string(run_color)
        if size:
            run.font.size = Pt(size)
        run_font = run_style.font if run_style and run_style.font else font
        if run_font:
            run.font.name = run_font
            run._r.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), run_font)
        if run_fill:
            run._r.get_or_add_rPr().append(_element("shd", val="clear", fill=run_fill))

    fragments = runs if runs and "".join(part.text for part in runs) == text else [ProductionTextRun(text=text)]
    for part in fragments:
        fragment = _text(part.text)
        run_style = part.style or style
        if style and part.style:
            run_style = style.model_copy(update=part.style.model_dump(exclude_none=True))
        offset = 0
        if inline_cues:
            for match in _INLINE_CUES.finditer(fragment):
                add_run(fragment[offset:match.start()], run_style=run_style)
                if match.lastgroup == "position":
                    add_run(match[0], run_style=run_style, run_fill=POSITION_FILL)
                else:
                    add_run(match[0], run_style=run_style, run_color="808080")
                offset = match.end()
        add_run(fragment[offset:], run_style=run_style)


def _band(table, text, *, chapter=False, style=None):
    cells = _row(table)
    _cell(
        cells[0].merge(cells[-1]), text, bold=True, fill=TITLE_FILL, keep_next=True,
        align=WD_ALIGN_PARAGRAPH.CENTER, size=14 if chapter else None, border=True, style=style,
    )


def _details(table, rows, *, merged=False):
    for label, text in rows:
        cells = _row(table)
        _cell(cells[0], label, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
        target = cells[1].merge(cells[-1]) if merged else cells[1]
        _cell(target, text, font="PMingLiU" if not merged and label == "環境" else None)


def _cue_colors(label, kind, cue_target=None):
    if cue_target == "continuousEffect":
        return CONTINUOUS_EFFECT_FILL, None, None
    if cue_target == "background":
        return BACKGROUND_FILL, None, None
    if kind == "position" or label == "@":
        return POSITION_FILL, None, None
    if label in EFFECT_SYMBOLS:
        return CONTINUOUS_EFFECT_FILL, None, None
    if label in BACKGROUND_SYMBOLS:
        return BACKGROUND_FILL, None, None
    if label == "#SE" or kind == "cue":
        return None, "7F7F7F", "808080"
    if kind == "pause":
        return None, None, "7F7F7F"
    return None, None, None


def build_production_script_docx(script: ProductionScriptRequest) -> bytes:
    document = Document()
    document.core_properties.title = _text(script.title)[:255]
    document.core_properties.author = _text(script.author)[:255]
    section = document.sections[0]
    section.page_width, section.page_height = Twips(11906), Twips(16838)
    section.left_margin = section.right_margin = Twips(1080)
    section.top_margin = section.bottom_margin = Twips(1440)

    for name, size in (("Normal", 12), ("Title", 20), ("Heading 1", 12)):
        style = document.styles[name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor(0, 0, 0)
        properties = style.element.get_or_add_rPr()
        for attribute in ("asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme"):
            properties.rFonts.attrib.pop(qn(f"w:{attribute}"), None)
        properties.rFonts.set(qn("w:eastAsia"), "PMingLiU" if name == "Title" else "Calibri")
        language = properties.find(qn("w:lang"))
        if language is None:
            language = _element("lang")
            properties.append(language)
        language.set(qn("w:eastAsia"), "zh-TW")
    normal = document.styles["Normal"].paragraph_format
    normal.space_before, normal.space_after = Pt(0), Pt(0)
    normal.line_spacing = 1.5
    for border in document.styles["Title"].element.xpath("./w:pPr/w:pBdr"):
        border.getparent().remove(border)

    title = document.add_paragraph(_text(script.title or "劇本"), style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_before = Pt(0)
    title.paragraph_format.space_after = Pt(10)
    title.paragraph_format.line_spacing = 1.15
    title.runs[0].bold = True
    _bottom_rule(title)

    front = _table(document, (1357, 3600, 1357, 3462))
    _band(front, "作品資訊")
    if script.author or script.rating:
        for index, (cell, field) in enumerate(zip(_row(front), ("台本師", script.author, "分級", script.rating))):
            is_label = index % 2 == 0
            _cell(cell, field, bold=is_label, align=WD_ALIGN_PARAGRAPH.CENTER if is_label else None)
    _details(front, script.work, merged=True)
    if script.characters:
        _band(front, "人物設定")
        _details(front, script.characters, merged=True)
    _band(front, "標記說明")
    for label, text in LEGEND:
        cells = _row(front)
        fill, label_color, body_color = _cue_colors(label, "pause" if text == "（空一行表示停頓）" else "speech")
        _cell(cells[0], label, align=WD_ALIGN_PARAGRAPH.RIGHT, fill=fill, color=label_color)
        _cell(cells[1].merge(cells[-1]), text, fill=fill, color=body_color, inline_cues=True)
    for paragraph in front._tbl.xpath(".//w:p"):
        paragraph.get_or_add_pPr().spacing_line = 336

    headings = [chapter.heading for chapter in script.chapters if chapter.heading]
    if headings:
        separator = document.add_paragraph()
        separator.paragraph_format.keep_with_next = True
        separator.paragraph_format.line_spacing = Pt(10)
        _bottom_rule(separator)
        heading_list = document.add_heading("章節目錄", level=1)
        heading_list.paragraph_format.space_before = Pt(10)
        heading_list.paragraph_format.space_after = Pt(4)
        for heading in headings:
            entry = document.add_paragraph(_text(heading))
            entry.paragraph_format.left_indent = Twips(240)

    for index, chapter in enumerate(script.chapters):
        if index == 0:
            document.add_page_break()
        elif chapter.heading:
            document.add_paragraph()
        if chapter.heading or chapter.details:
            chapter_info = _table(document)
            if chapter.heading:
                _band(chapter_info, chapter.heading, chapter=True, style=chapter.style)
            _details(chapter_info, chapter.details)
            if chapter.rows:
                paragraph = document.add_paragraph()
                paragraph.paragraph_format.space_after = Pt(10)
                paragraph.paragraph_format.keep_with_next = True
                _bottom_rule(paragraph)
        if chapter.rows:
            table = _table(document)
            for row in chapter.rows:
                fill, label_color, body_color = _cue_colors(row.label, row.kind, row.cueTarget)
                if row.kind == "speech" and not row.label and row.text == "END":
                    fill, body_color = "808080", "FFFFFF"
                label, text = _row(table)
                _cell(label, row.label, align=WD_ALIGN_PARAGRAPH.RIGHT, fill=fill, color=label_color,
                      style=row.labelStyle if row.labelStyle is not None else row.style)
                _cell(text, row.text, fill=fill, color=body_color, inline_cues=True, style=row.style, runs=row.runs)

    output = io.BytesIO()
    document.save(output)
    return output.getvalue()
