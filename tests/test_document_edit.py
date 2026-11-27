"""Regression checks for editing selectable, hard-coded PDF text."""

import sys
from pathlib import Path

import fitz

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.engine import analyze_and_process_pdf, replace_fields_in_session


def spans_containing(pdf_bytes: bytes, needle: str):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    return [
        span
        for page in doc
        for block in page.get_text("dict").get("blocks", [])
        for line in block.get("lines", [])
        for span in line.get("spans", [])
        if needle in span.get("text", "")
    ]


def replace_first(session, text: str):
    items = [dict(item) for item in session["static_texts"]]
    items[0]["text"] = text
    return replace_fields_in_session(session, session["fields"], items)


def main():
    with open(PROJECT_ROOT / "assets/forms/sample-template.pdf", "rb") as source:
        session = analyze_and_process_pdf(source.read())

    original = session["static_texts"][0]["text"]
    original_images = sum(len(page.get_image_info()) for page in fitz.open(stream=session["clean_blank_pdf"], filetype="pdf"))

    session = replace_first(session, "TemplateCraft QA")
    first = spans_containing(session["clean_blank_pdf"], "TemplateCraft QA")
    assert len(first) == 1
    assert not spans_containing(session["clean_blank_pdf"], original)
    assert "Bold" in first[0]["font"] and round(first[0]["size"], 1) == 10.0

    session = replace_first(session, "A deliberately much longer replacement heading that must stay inside its original line")
    long_text = spans_containing(session["clean_blank_pdf"], "deliberately much longer")
    assert len(long_text) == 1
    assert 4.0 <= long_text[0]["size"] < 10.0
    assert not spans_containing(session["clean_blank_pdf"], "TemplateCraft QA")

    session = replace_first(session, original)
    assert len(spans_containing(session["clean_blank_pdf"], original)) == 1
    final_doc = fitz.open(stream=session["clean_blank_pdf"], filetype="pdf")
    final_images = sum(len(page.get_image_info()) for page in final_doc)
    assert final_images == original_images
    assert "Sample use only" in final_doc[0].get_text()

    print("Document editing regression passed: replace, re-edit, restore, auto-fit, typography, images, and nearby text.")


if __name__ == "__main__":
    main()
