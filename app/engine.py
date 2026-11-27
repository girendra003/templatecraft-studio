"""
Core PDF Template Extraction, AcroForm Generation & Precision Alignment Engine
"""

import os
import io
import json
import zipfile
import base64
import fitz
import pypdf
from app.sample import SAMPLE_FIELDS
from typing import Dict, List, Any, Tuple, Optional


def generate_signzy_schema(fields_summary: List[Dict[str, Any]], stamps_applied: List[Dict[str, Any]] = None, page_no: int = 1) -> Dict[str, Any]:
    """
    Generates the exact Signzy-compatible schema format:
    {
      "key": {
        "type": "TEXTFIELD" | "CHECKBOX",
        "pageNo": 1
      },
      "signature_img_af_image": {
        "type": "IMAGE",
        "value": "",
        "dimensions": {
          "xCoordinate": 63,
          "yCoordinate": 463,
          "width": 489,
          "height": 355
        },
        "pageNo": 1
      }
    }
    """
    schema = {}
    for f in fields_summary:
        key = f["key"]
        ftype = f.get("type", "text").lower()
        f_page_no = int(f.get("page_no") or page_no)

        if ftype == "checkbox":
            schema[key] = {
                "type": "CHECKBOX",
                "pageNo": f_page_no
            }
        elif ftype in ["signature", "image"]:
            rect_coords = f.get("bbox") or f.get("rect")
            x0, y0, x1, y1 = rect_coords
            img_key = key if key.endswith("_af_image") else f"{key}_af_image"
            schema[img_key] = {
                "type": "IMAGE",
                "value": "",
                "dimensions": {
                    "xCoordinate": round(x0),
                    "yCoordinate": round(y0),
                    "width": round(x1 - x0),
                    "height": round(y1 - y0)
                },
                "pageNo": f_page_no
            }
        else:
            schema[key] = {
                "type": "TEXTFIELD",
                "pageNo": f_page_no
            }

    if stamps_applied:
        for idx, s in enumerate(stamps_applied):
            x0, y0, x1, y1 = s["rect"]
            stamp_key = s.get("key", f"stamp_{idx+1}_af_image")
            s_page_no = int(s.get("page_no") or page_no)
            schema[stamp_key] = {
                "type": "IMAGE",
                "value": "",
                "dimensions": {
                    "xCoordinate": round(x0),
                    "yCoordinate": round(y0),
                    "width": round(x1 - x0),
                    "height": round(y1 - y0)
                },
                "pageNo": s_page_no
            }

    return schema


def detect_form_type(input_bytes: bytes) -> str:
    """Distinguish the fictional demo from arbitrary user documents."""
    with fitz.open(stream=input_bytes, filetype="pdf") as doc:
        return "SAMPLE_FORM" if any("TEMPLATECRAFT SAMPLE" in page.get_text() for page in doc) else "PDF_FORM"


def extract_pdf_fields(input_bytes: bytes) -> List[Dict[str, Any]]:
    """Import existing AcroForm widgets without injecting unrelated template data."""
    fields = []
    with fitz.open(stream=input_bytes, filetype="pdf") as doc:
        for page_number, page in enumerate(doc, 1):
            for index, widget in enumerate(page.widgets() or []):
                kind = "checkbox" if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX else "signature" if widget.field_type == fitz.PDF_WIDGET_TYPE_SIGNATURE else "textarea" if widget.field_flags & fitz.PDF_TX_FIELD_IS_MULTILINE else "text"
                key = widget.field_name or f"page_{page_number}_field_{index + 1}"
                fields.append({"key": key, "label": widget.field_label or key.replace("_", " ").title(), "page_no": page_number, "rect": tuple(widget.rect), "section": f"Page {page_number}", "type": kind, "font_size": widget.text_fontsize or 10, "description": "Imported PDF field", "sample_value": ""})
    return fields


def clean_pdf_streams(input_bytes: bytes, form_type: str = "PDF_FORM") -> bytes:
    """Remove widgets/annotations while preserving all document content and images."""
    reader = pypdf.PdfReader(io.BytesIO(input_bytes))
    writer = pypdf.PdfWriter()
    for page in reader.pages:
        page_obj = page.get_object()
        if "/Annots" in page_obj:
            del page_obj["/Annots"]
        writer.add_page(page)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def embed_image_permanent(
    pdf_bytes: bytes,
    image_bytes: bytes,
    rect: Tuple[float, float, float, float],
    page_num: int = 0,
    keep_proportion: bool = True
) -> bytes:
    """Permanently burns/stamps an image into the base vector PDF content stream."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_num < len(doc):
        page = doc[page_num]
        fitz_rect = fitz.Rect(rect)
        page.insert_image(fitz_rect, stream=image_bytes, keep_proportion=keep_proportion, overlay=True)

    out_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return out_bytes


def _font_profile(font_name: str, flags: int = 0) -> Dict[str, str]:
    """Map an embedded font to a safe Base-14 font while retaining its style."""
    clean_name = (font_name or "Helvetica").split("+")[-1]
    lowered = clean_name.lower()
    bold = bool(flags & 16) or any(token in lowered for token in ("bold", "black", "semibold", "demi"))
    italic = bool(flags & 2) or any(token in lowered for token in ("italic", "oblique"))

    if any(token in lowered for token in ("times", "serif", "georgia")):
        family, fonts, widget_fonts = "Times", ("tiro", "tibo", "tiit", "tibi"), ("TiRo", "TiBo", "TiIt", "TiBI")
    elif any(token in lowered for token in ("courier", "mono", "consolas")):
        family, fonts, widget_fonts = "Courier", ("cour", "cobo", "coit", "cobi"), ("Cour", "CoBo", "CoOb", "CoBO")
    else:
        family, fonts, widget_fonts = "Helvetica", ("helv", "hebo", "heit", "hebi"), ("Helv", "HeBo", "HeIt", "HeBI")

    index = 3 if bold and italic else 1 if bold else 2 if italic else 0
    style = "Bold Italic" if bold and italic else "Bold" if bold else "Italic" if italic else "Regular"
    return {
        "source_font": clean_name,
        "font_family": family,
        "font_style": style,
        "pdf_font": fonts[index],
        "widget_font": widget_fonts[index],
    }


def _color_hex(color_value: int) -> str:
    red, green, blue = fitz.sRGB_to_rgb(int(color_value or 0))
    return f"#{red:02x}{green:02x}{blue:02x}"


def _color_tuple(color_hex: str) -> Tuple[float, float, float]:
    value = str(color_hex or "#000000").lstrip("#")
    if len(value) != 6:
        return (0.0, 0.0, 0.0)
    try:
        return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))
    except ValueError:
        return (0.0, 0.0, 0.0)


def detect_field_typography(pdf_bytes: bytes, fields_def: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect typography crossing each field and attach a PDF-safe match profile."""
    detected_fields = [dict(field) for field in fields_def]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_spans: Dict[int, List[Dict[str, Any]]] = {}

    for page_number, page in enumerate(doc, start=1):
        spans = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                spans.extend(span for span in line.get("spans", []) if span.get("text", "").strip())
        page_spans[page_number] = spans

    for field in detected_fields:
        if field.get("type") != "text":
            continue
        rect = fitz.Rect(field.get("rect") or field.get("bbox"))
        candidates = []
        for span in page_spans.get(int(field.get("page_no", 1)), []):
            span_rect = fitz.Rect(span["bbox"])
            overlap = rect & span_rect
            if overlap.is_empty:
                continue
            overlap_area = max(0.0, overlap.width * overlap.height)
            span_area = max(1.0, span_rect.width * span_rect.height)
            candidates.append((overlap_area / span_area, len(span.get("text", "")), span))

        if candidates:
            span = max(candidates, key=lambda item: (item[0], item[1]))[2]
            profile = _font_profile(span.get("font", ""), int(span.get("flags", 0)))
            field.update(profile)
            field["font_size"] = round(float(span.get("size") or field.get("font_size") or 8), 1)
            field["font_color"] = _color_hex(span.get("color", 0))
            field["font_detected"] = True
            field["font_match_note"] = f"Detected {profile['source_font']}; rendered with compatible {profile['font_family']} metrics"
        else:
            profile = _font_profile("Helvetica")
            field.update(profile)
            field["font_color"] = "#000000"
            field["font_detected"] = False
            field["font_match_note"] = "No source text crossed this field; using the template default"

    doc.close()
    return detected_fields


def extract_static_texts(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """Expose visible PDF text spans as editable document content."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    items = []
    for page_number, page in enumerate(doc, start=1):
        span_index = 0
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "")
                    if not text.strip():
                        continue
                    profile = _font_profile(span.get("font", ""), int(span.get("flags", 0)))
                    items.append({
                        "id": f"p{page_number}_text_{span_index}",
                        "page_no": page_number,
                        "text": text,
                        "original_text": text,
                        "bbox": [round(float(value), 2) for value in span["bbox"]],
                        "font_size": round(float(span.get("size") or 8), 1),
                        "font_color": _color_hex(span.get("color", 0)),
                        **profile,
                    })
                    span_index += 1
    doc.close()
    return items


def apply_static_text_edits(
    pdf_bytes: bytes,
    current_items: List[Dict[str, Any]],
    next_items: List[Dict[str, Any]],
) -> bytes:
    """Replace changed hard-coded text while preserving its detected appearance."""
    current_by_id = {item.get("id"): item for item in current_items}
    changed = [item for item in next_items if item.get("id") in current_by_id and item.get("text") != current_by_id[item.get("id")].get("text")]
    if not changed:
        return pdf_bytes

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    by_page: Dict[int, List[Dict[str, Any]]] = {}
    for item in changed:
        by_page.setdefault(int(item.get("page_no", 1)) - 1, []).append(item)

    for page_index, page_items in by_page.items():
        if page_index < 0 or page_index >= len(doc):
            continue
        page = doc[page_index]
        for item in page_items:
            page.add_redact_annot(fitz.Rect(item["bbox"]), fill=None, cross_out=False)
        page.apply_redactions(
            images=fitz.PDF_REDACT_IMAGE_NONE,
            graphics=fitz.PDF_REDACT_LINE_ART_NONE,
            text=fitz.PDF_REDACT_TEXT_REMOVE,
        )
        for item in page_items:
            text = str(item.get("text", ""))
            if not text:
                continue
            rect = fitz.Rect(item["bbox"])
            original_size = float(item.get("font_size") or 8)
            fontname = item.get("pdf_font", "helv")
            text_width = fitz.get_text_length(text, fontname=fontname, fontsize=original_size)
            available_width = max(1.0, rect.width)
            size = max(4.0, min(original_size, original_size * available_width / max(1.0, text_width)))
            page.insert_text(
                fitz.Point(rect.x0, rect.y1 - max(1.0, size * 0.12)),
                text,
                fontsize=size,
                fontname=fontname,
                color=_color_tuple(item.get("font_color", "#000000")),
                overlay=True,
            )

    output = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return output


def build_acroform_template(blank_pdf_bytes: bytes, fields_def: List[Dict[str, Any]] = None) -> bytes:
    """
    Injects standard AcroForm widgets into the clean blank PDF.
    Excludes wet signatures and image areas from editable text widgets so they stay clean
    while their coordinates are tracked for Signzy IMAGE injection.
    Supports multi-page documents by routing widgets to their designated page.
    """
    if fields_def is None:
        fields_def = []

    doc = fitz.open(stream=blank_pdf_bytes, filetype="pdf")

    for f in fields_def:
        # Wet signatures and image fields are handled as IMAGE tags in Signzy, so they should NOT be editable text widgets
        if f.get("type") in ["signature", "image"]:
            continue

        rect_coords = f.get("rect") or f.get("bbox")
        if not rect_coords:
            continue

        pno = max(0, min(f.get("page_no", 1) - 1, len(doc) - 1))
        page = doc[pno]

        w = fitz.Widget()
        w.rect = fitz.Rect(rect_coords)
        w.field_name = f["key"]

        if f["type"] == "checkbox":
            w.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
            w.field_value = "Off"
        else:
            w.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            if f.get("type") == "textarea":
                w.field_flags = fitz.PDF_TX_FIELD_IS_MULTILINE
            w.text_fontsize = f.get("font_size", 8) or 8
            w.text_font = f.get("widget_font", "Helv")
            w.text_color = _color_tuple(f.get("font_color", "#000000"))
            w.field_value = ""

        page.add_widget(w)

    raw_template_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()

    reader = pypdf.PdfReader(io.BytesIO(raw_template_bytes))
    writer = pypdf.PdfWriter()
    writer.clone_reader_document_root(reader)

    acro_form = writer.root_object.get("/AcroForm")
    if acro_form:
        font_dict = pypdf.generic.DictionaryObject({
            pypdf.generic.NameObject("/Type"): pypdf.generic.NameObject("/Font"),
            pypdf.generic.NameObject("/Subtype"): pypdf.generic.NameObject("/Type1"),
            pypdf.generic.NameObject("/BaseFont"): pypdf.generic.NameObject("/Helvetica")
        })
        dr_dict = pypdf.generic.DictionaryObject({
            pypdf.generic.NameObject("/Font"): pypdf.generic.DictionaryObject({
                pypdf.generic.NameObject("/Helv"): font_dict
            })
        })
        acro_form[pypdf.generic.NameObject("/DR")] = dr_dict
        acro_form[pypdf.generic.NameObject("/DA")] = pypdf.generic.TextStringObject("/Helv 8 Tf 0 g")
        acro_form[pypdf.generic.NameObject("/NeedAppearances")] = pypdf.generic.BooleanObject(True)

    final_stream = io.BytesIO()
    writer.write(final_stream)
    return final_stream.getvalue()


def render_visual_map(blank_pdf_bytes: bytes, fields_def: List[Dict[str, Any]] = None, page_num: int = 0, dpi: int = 150) -> bytes:
    """Renders high-resolution visual PNG with highlighted field boxes and key labels for a specific page."""
    if fields_def is None:
        fields_def = []

    doc = fitz.open(stream=blank_pdf_bytes, filetype="pdf")
    if page_num >= len(doc):
        page_num = 0
    page = doc[page_num]

    target_page_no = page_num + 1
    page_fields = [f for f in fields_def if f.get("page_no", 1) == target_page_no] if len(doc) > 1 else fields_def

    for f in page_fields:
        rect_coords = f.get("rect") or f.get("bbox")
        if not rect_coords:
            continue
        r = fitz.Rect(rect_coords)
        color = f.get("color", (0.2, 0.5, 0.9))

        shape = page.new_shape()
        shape.draw_rect(r)
        shape.finish(color=color, fill=color, fill_opacity=0.18, width=1.0)
        shape.commit()

        fontsize = 5.2 if r.height < 25 else 6.0
        label_y = r.y0 + (r.height * 0.65) if r.height < 25 else r.y0 + 10
        page.insert_text(
            fitz.Point(r.x0 + 2, label_y),
            f["key"],
            fontsize=fontsize,
            fontname="helv",
            color=(0.85, 0.0, 0.0)
        )

    pix = page.get_pixmap(dpi=dpi)
    img_bytes = pix.tobytes("png")
    doc.close()
    return img_bytes


def render_all_visual_maps(blank_pdf_bytes: bytes, fields_def: List[Dict[str, Any]] = None, dpi: int = 150) -> List[bytes]:
    """Renders visual maps for all pages of the PDF."""
    doc = fitz.open(stream=blank_pdf_bytes, filetype="pdf")
    count = len(doc)
    doc.close()
    return [render_visual_map(blank_pdf_bytes, fields_def, page_num=i, dpi=dpi) for i in range(count)]


def render_page_preview(pdf_bytes: bytes, page_num: int = 0, dpi: int = 150) -> bytes:
    """Renders single page PDF to PNG."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_num >= len(doc):
        page_num = 0
    pix = doc[page_num].get_pixmap(dpi=dpi)
    img_bytes = pix.tobytes("png")
    doc.close()
    return img_bytes


def render_all_pages_previews(pdf_bytes: bytes, dpi: int = 150) -> List[bytes]:
    """Renders previews for all pages of the PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    count = len(doc)
    doc.close()
    return [render_page_preview(pdf_bytes, page_num=i, dpi=dpi) for i in range(count)]


def fill_template_pdf(
    template_bytes: bytes,
    data: Dict[str, Any],
    flatten: bool = True,
    fields_def: Optional[List[Dict[str, Any]]] = None,
    match_source_format: bool = True,
) -> bytes:
    """
    Fills data into AcroForm templates across all pages
    and optional vector flattening (default: True for E-Sign / KYC readiness).
    """
    doc = fitz.open(stream=template_bytes, filetype="pdf")
    styles = {field.get("key"): field for field in (fields_def or [])}

    for page in doc:
        for w in page.widgets():
            name = w.field_name
            if name in data and data[name] is not None:
                raw_val = str(data[name])

                if w.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                    if str(raw_val).lower() in ["true", "1", "yes", "/yes", "on"]:
                        w.field_value = "Yes"
                    else:
                        w.field_value = "Off"
                else:
                    w.field_value = raw_val
                    style = styles.get(name, {}) if match_source_format else {}
                    w.text_font = style.get("widget_font", "Helv")
                    w.text_fontsize = style.get("font_size", 8) or 8
                    w.text_color = _color_tuple(style.get("font_color", "#000000"))

                w.update()

        if flatten:
            for w in list(page.widgets()):
                rect = w.rect
                val = w.field_value
                name = w.field_name

                if val and val != "Off":
                    if w.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                        # Draw solid check indicator
                        page.draw_rect(fitz.Rect(rect.x0 + 1.5, rect.y0 + 1.5, rect.x1 - 1.5, rect.y1 - 1.5), fill=(0, 0, 0))
                    else:
                        style = styles.get(name, {}) if match_source_format else {}
                        fontsize = style.get("font_size", 8) or 8
                        fontname = style.get("pdf_font", "helv")
                        fontcolor = _color_tuple(style.get("font_color", "#000000"))
                        val_str = str(val)
                        if "\n" in val_str:
                            lines = val_str.split("\n")
                            line_h = fontsize + 1.2
                            total_h = len(lines) * line_h
                            start_y = rect.y0 + (rect.height - total_h) / 2 + fontsize
                            for idx, line in enumerate(lines):
                                page.insert_text(
                                    fitz.Point(rect.x0 + 3, start_y + (idx * line_h)),
                                    line,
                                    fontsize=fontsize,
                                    fontname=fontname,
                                    color=fontcolor
                                )
                        else:
                            text_y = rect.y0 + fontsize + (rect.height - fontsize) / 2 - 1
                            page.insert_text(
                                fitz.Point(rect.x0 + 3, text_y),
                                val_str,
                                fontsize=fontsize,
                                fontname=fontname,
                                color=fontcolor
                            )
                page.delete_widget(w)

    out_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return out_bytes


def create_bundle_zip(
    template_pdf_bytes: bytes,
    blank_pdf_bytes: bytes,
    visual_map_png_bytes: bytes,
    fields_mapping_dict: Dict[str, Any],
    signzy_schema_dict: Dict[str, Any],
    sample_data_dict: Dict[str, Any]
) -> bytes:
    """Creates a downloadable ZIP archive containing all project assets."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("template.pdf", template_pdf_bytes)
        zf.writestr("blank.pdf", blank_pdf_bytes)
        zf.writestr("field_coordinates_map.png", visual_map_png_bytes)
        zf.writestr("fields_mapping.json", json.dumps(fields_mapping_dict, indent=2))
        zf.writestr("signzy_editables_schema.json", json.dumps(signzy_schema_dict, indent=2))
        zf.writestr("sample_data.json", json.dumps(sample_data_dict, indent=2))
    return zip_buffer.getvalue()


def analyze_and_process_pdf(input_pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Main processing pipeline:
    1. Recognizes the fictional sample or imports existing AcroForm fields
    2. Strips dynamic data safely -> creates clean blank vector PDF
    3. Builds interactive AcroForm editable template
    4. Renders visual coordinates map for all pages
    5. Renders clean preview image for all pages
    6. Builds Signzy exact schema format with per-field pageNo
    7. Returns complete metadata schema + assets
    """
    form_type = detect_form_type(input_pdf_bytes)
    fields_def = SAMPLE_FIELDS if form_type == "SAMPLE_FORM" else extract_pdf_fields(input_pdf_bytes)

    fields_def = detect_field_typography(input_pdf_bytes, fields_def)
    static_texts = extract_static_texts(input_pdf_bytes)

    clean_blank_bytes = clean_pdf_streams(input_pdf_bytes, form_type=form_type)
    editable_template_bytes = build_acroform_template(clean_blank_bytes, fields_def)

    doc_blank = fitz.open(stream=clean_blank_bytes, filetype="pdf")
    page_count = len(doc_blank)
    doc_blank.close()

    all_previews = render_all_pages_previews(clean_blank_bytes)
    all_visual_maps = render_all_visual_maps(clean_blank_bytes, fields_def)

    pages_previews_base64 = [base64.b64encode(p).decode("utf-8") for p in all_previews]
    pages_visual_maps_base64 = [base64.b64encode(m).decode("utf-8") for m in all_visual_maps]

    preview_img_bytes = all_previews[0] if all_previews else b""
    visual_map_bytes = all_visual_maps[0] if all_visual_maps else b""

    fields_summary = []
    for f in fields_def:
        x0, y0, x1, y1 = f["rect"]
        fields_summary.append({
            "key": f["key"],
            "page_no": f.get("page_no", 1),
            "section": f["section"],
            "label": f["label"],
            "type": f["type"],
            "bbox": [round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1)],
            "width": round(x1 - x0, 1),
            "height": round(y1 - y0, 1),
            "font_size": f.get("font_size"),
            "source_font": f.get("source_font"),
            "font_family": f.get("font_family"),
            "font_style": f.get("font_style"),
            "font_color": f.get("font_color", "#000000"),
            "pdf_font": f.get("pdf_font", "helv"),
            "widget_font": f.get("widget_font", "Helv"),
            "font_detected": f.get("font_detected", False),
            "font_match_note": f.get("font_match_note", ""),
            "description": f["description"],
            "sample_value": f["sample_value"]
        })

    sample_data = {f["key"]: f["sample_value"] for f in fields_def}
    signzy_schema = generate_signzy_schema(fields_summary, stamps_applied=None, page_no=1)

    bundle_zip_bytes = create_bundle_zip(
        editable_template_bytes,
        clean_blank_bytes,
        visual_map_bytes,
        {"total_fields": len(fields_summary), "fields": fields_summary},
        signzy_schema,
        sample_data
    )

    return {
        "form_type": form_type,
        "page_count": page_count,
        "total_fields": len(fields_summary),
        "fields": fields_summary,
        "static_texts": static_texts,
        "signzy_schema": signzy_schema,
        "clean_blank_pdf": clean_blank_bytes,
        "editable_template_pdf": editable_template_bytes,
        "visual_map_png": visual_map_bytes,
        "preview_png": preview_img_bytes,
        "pages_previews_base64": pages_previews_base64,
        "pages_base_previews_base64": pages_previews_base64,
        "pages_visual_maps_base64": pages_visual_maps_base64,
        "sample_data": sample_data,
        "bundle_zip": bundle_zip_bytes,
        "original_blank_pdf": clean_blank_bytes,
        "stamps_applied": [],
        "stamp_placements": []
    }


def apply_stamp_to_session(
    session: Dict[str, Any],
    image_bytes: bytes,
    rect: Tuple[float, float, float, float],
    keep_proportion: bool = True,
    stamp_name: Optional[str] = None,
    target_key: Optional[str] = None,
    page_no: int = 1
) -> Dict[str, Any]:
    """Burns stamp into current clean_blank_pdf on specific page and updates all downstream assets in session."""
    # Preserve all user field edits when a stamp is applied.
    fields_def = session.get("fields", [])

    page_num = max(0, page_no - 1)
    current_blank = session["clean_blank_pdf"]
    updated_blank = embed_image_permanent(current_blank, image_bytes, rect, page_num=page_num, keep_proportion=keep_proportion)

    updated_template = build_acroform_template(updated_blank, fields_def)
    all_visual_maps = render_all_visual_maps(updated_blank, fields_def)
    all_previews = render_all_pages_previews(updated_blank)

    session["clean_blank_pdf"] = updated_blank
    session["editable_template_pdf"] = updated_template
    session["visual_map_png"] = all_visual_maps[0] if all_visual_maps else b""
    session["preview_png"] = all_previews[0] if all_previews else b""
    session["pages_visual_maps_base64"] = [base64.b64encode(m).decode("utf-8") for m in all_visual_maps]
    session["pages_previews_base64"] = [base64.b64encode(p).decode("utf-8") for p in all_previews]

    stamps = session.setdefault("stamps_applied", [])
    idx = len(stamps) + 1
    key = target_key or f"stamp_{idx}_af_image"
    stamps.append({
        "key": key,
        "name": stamp_name or f"Seal {idx}",
        "rect": [round(c, 1) for c in rect],
        "page_no": page_no,
        "keep_proportion": keep_proportion
    })

    updated_signzy_schema = generate_signzy_schema(session["fields"], stamps_applied=session["stamps_applied"], page_no=1)
    session["signzy_schema"] = updated_signzy_schema

    session["bundle_zip"] = create_bundle_zip(
        updated_template,
        updated_blank,
        session["visual_map_png"],
        {"total_fields": session["total_fields"], "fields": session["fields"]},
        updated_signzy_schema,
        session.get("sample_data", {})
    )

    return session


def update_field_coordinates_in_session(
    session: Dict[str, Any],
    key: str,
    rect: Tuple[float, float, float, float],
    page_no: int = 1
) -> Dict[str, Any]:
    """Updates coordinates of a specific image or signature field dynamically from the cursor tool."""
    fields_list = session.get("fields", [])
    found = False

    for f in fields_list:
        f_key = f["key"]
        # Match either exact key or af_image alias
        if f_key == key or f"{f_key}_af_image" == key or (key.endswith("_af_image") and f_key == key[:-9]):
            f["bbox"] = [round(rect[0], 1), round(rect[1], 1), round(rect[2], 1), round(rect[3], 1)]
            f["width"] = round(rect[2] - rect[0], 1)
            f["height"] = round(rect[3] - rect[1], 1)
            f["rect"] = (rect[0], rect[1], rect[2], rect[3])
            if page_no:
                f["page_no"] = page_no
            found = True
            break

    if not found:
        # If it's a new custom image zone
        clean_key = key if key.endswith("_af_image") else f"{key}_af_image"
        fields_list.append({
            "key": clean_key,
            "page_no": page_no or 1,
            "section": f"Custom Signature / Image Zones (Page {page_no or 1})",
            "label": clean_key,
            "type": "signature" if "sign" in clean_key.lower() else "image",
            "bbox": [round(rect[0], 1), round(rect[1], 1), round(rect[2], 1), round(rect[3], 1)],
            "width": round(rect[2] - rect[0], 1),
            "height": round(rect[3] - rect[1], 1),
            "font_size": None,
            "description": f"Custom cursor mapped {clean_key}",
            "sample_value": ""
        })

    session["fields"] = fields_list
    session["total_fields"] = len(fields_list)
    signzy_schema = generate_signzy_schema(fields_list, stamps_applied=session.get("stamps_applied", []), page_no=1)
    session["signzy_schema"] = signzy_schema

    clean_blank = session["clean_blank_pdf"]
    all_visual_maps = render_all_visual_maps(clean_blank, fields_list)
    session["visual_map_png"] = all_visual_maps[0] if all_visual_maps else b""
    session["pages_visual_maps_base64"] = [base64.b64encode(m).decode("utf-8") for m in all_visual_maps]

    template = build_acroform_template(clean_blank, fields_list)
    session["editable_template_pdf"] = template

    session["bundle_zip"] = create_bundle_zip(
        template,
        clean_blank,
        session["visual_map_png"],
        {"total_fields": session["total_fields"], "fields": session["fields"]},
        signzy_schema,
        session.get("sample_data", {})
    )

    return session


def delete_field_from_session(session: Dict[str, Any], key: str) -> Dict[str, Any]:
    """Remove a field and rebuild every generated asset that depends on it."""
    fields_list = session.get("fields", [])
    remaining_fields = [field for field in fields_list if field.get("key") != key]
    if len(remaining_fields) == len(fields_list):
        raise KeyError(f"Field not found: {key}")

    session["fields"] = remaining_fields
    session["total_fields"] = len(remaining_fields)
    session.get("sample_data", {}).pop(key, None)
    session["stamps_applied"] = [
        stamp for stamp in session.get("stamps_applied", [])
        if stamp.get("key") != key
    ]

    signzy_schema = generate_signzy_schema(
        remaining_fields,
        stamps_applied=session.get("stamps_applied", []),
        page_no=1,
    )
    session["signzy_schema"] = signzy_schema

    clean_blank = session["clean_blank_pdf"]
    all_visual_maps = render_all_visual_maps(clean_blank, remaining_fields)
    session["visual_map_png"] = all_visual_maps[0] if all_visual_maps else b""
    session["pages_visual_maps_base64"] = [
        base64.b64encode(page).decode("utf-8") for page in all_visual_maps
    ]

    template = build_acroform_template(clean_blank, remaining_fields)
    session["editable_template_pdf"] = template
    session["bundle_zip"] = create_bundle_zip(
        template,
        clean_blank,
        session["visual_map_png"],
        {"total_fields": session["total_fields"], "fields": remaining_fields},
        signzy_schema,
        session.get("sample_data", {}),
    )
    return session


def replace_fields_in_session(
    session: Dict[str, Any],
    fields: List[Dict[str, Any]],
    static_texts: Optional[List[Dict[str, Any]]] = None,
    stamp_placements: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Replace editable fields and hard-coded document text, then rebuild assets."""
    normalized_fields = []
    for index, incoming in enumerate(fields):
        field = dict(incoming)
        key = str(field.get("key", "")).strip()
        bbox = field.get("bbox")
        if not key:
            raise ValueError(f"Field {index + 1} has an empty name.")
        if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
            raise ValueError(f"Field '{key}' has invalid bounds.")
        rect = [round(float(value), 1) for value in bbox]
        if rect[2] <= rect[0] or rect[3] <= rect[1]:
            raise ValueError(f"Field '{key}' has invalid width or height.")
        field["key"] = key
        field["label"] = str(field.get("label") or key).strip() or key
        field["description"] = str(field.get("description") or "").strip()
        field["bbox"] = rect
        field["rect"] = tuple(rect)
        field["width"] = round(rect[2] - rect[0], 1)
        field["height"] = round(rect[3] - rect[1], 1)
        field["page_no"] = max(1, int(field.get("page_no") or 1))
        normalized_fields.append(field)

    old_sample_data = session.get("sample_data", {})
    sample_data = {
        field["key"]: old_sample_data.get(field["key"], field.get("sample_value", ""))
        for field in normalized_fields
    }
    session["fields"] = normalized_fields
    session["total_fields"] = len(normalized_fields)
    session["sample_data"] = sample_data
    baseline_blank = session.get("original_blank_pdf", session["clean_blank_pdf"])
    if static_texts is not None:
        current_texts = session.get("static_texts", [])
        baseline_blank = apply_static_text_edits(baseline_blank, current_texts, static_texts)
        session["original_blank_pdf"] = baseline_blank
        session["static_texts"] = [dict(item) for item in static_texts]

    normalized_stamps = []
    for index, incoming in enumerate(stamp_placements or []):
        placement = dict(incoming)
        bbox = placement.get("bbox")
        if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
            raise ValueError(f"Stamp {index + 1} has invalid bounds.")
        rect = [round(float(value), 1) for value in bbox]
        if rect[2] <= rect[0] or rect[3] <= rect[1]:
            raise ValueError(f"Stamp {index + 1} has invalid width or height.")
        raw_image = str(placement.get("image_base64") or "").split(",")[-1]
        try:
            image_bytes = base64.b64decode(raw_image, validate=True)
        except Exception as exc:
            raise ValueError(f"Stamp {index + 1} has invalid image data.") from exc
        if not image_bytes:
            raise ValueError(f"Stamp {index + 1} has no image data.")
        placement["id"] = str(placement.get("id") or f"stamp_{index + 1}")
        placement["page_no"] = max(1, int(placement.get("page_no") or 1))
        placement["bbox"] = rect
        normalized_stamps.append(placement)

    clean_blank = baseline_blank
    for placement in normalized_stamps:
        clean_blank = embed_image_permanent(
            clean_blank,
            base64.b64decode(str(placement["image_base64"]).split(",")[-1]),
            tuple(placement["bbox"]),
            page_num=placement["page_no"] - 1,
            keep_proportion=True,
        )

    stamps_applied = [{
        "key": f"stamp_{placement['id']}_af_image",
        "name": placement.get("name") or "Stamp",
        "rect": placement["bbox"],
        "page_no": placement["page_no"],
        "keep_proportion": True,
    } for placement in normalized_stamps]
    session["stamp_placements"] = normalized_stamps
    session["stamps_applied"] = stamps_applied
    session["clean_blank_pdf"] = clean_blank
    signzy_schema = generate_signzy_schema(normalized_fields, stamps_applied=stamps_applied, page_no=1)
    session["signzy_schema"] = signzy_schema

    all_visual_maps = render_all_visual_maps(clean_blank, normalized_fields)
    all_previews = render_all_pages_previews(clean_blank)
    base_previews = render_all_pages_previews(baseline_blank)
    session["visual_map_png"] = all_visual_maps[0] if all_visual_maps else b""
    session["preview_png"] = all_previews[0] if all_previews else b""
    session["pages_visual_maps_base64"] = [
        base64.b64encode(page).decode("utf-8") for page in all_visual_maps
    ]
    session["pages_previews_base64"] = [
        base64.b64encode(page).decode("utf-8") for page in all_previews
    ]
    session["pages_base_previews_base64"] = [
        base64.b64encode(page).decode("utf-8") for page in base_previews
    ]
    template = build_acroform_template(clean_blank, normalized_fields)
    session["editable_template_pdf"] = template
    session["bundle_zip"] = create_bundle_zip(
        template,
        clean_blank,
        session["visual_map_png"],
        {"total_fields": len(normalized_fields), "fields": normalized_fields},
        signzy_schema,
        sample_data,
    )
    return session
