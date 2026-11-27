"""Regression checks for editable stamp placement layers."""

import base64
import sys
from pathlib import Path

import fitz

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.engine import analyze_and_process_pdf, replace_fields_in_session


def main():
    session = analyze_and_process_pdf((PROJECT_ROOT / "assets/forms/sample-template.pdf").read_bytes())
    baseline = fitz.open(stream=session["clean_blank_pdf"], filetype="pdf")
    baseline_images = [len(page.get_image_info()) for page in baseline]
    image_base64 = base64.b64encode((PROJECT_ROOT / "assets/stamps/demo-stamp.png").read_bytes()).decode()
    placement = {
        "id": "qa_stamp",
        "asset_id": "demo-stamp.png",
        "name": "QA Seal",
        "mime_type": "image/png",
        "image_base64": image_base64,
        "page_no": 2,
        "bbox": [100, 200, 200, 300],
    }

    session = replace_fields_in_session(session, session["fields"], session["static_texts"], [placement])
    stamped = fitz.open(stream=session["clean_blank_pdf"], filetype="pdf")
    assert len(stamped[0].get_image_info()) == baseline_images[0]
    assert len(stamped[1].get_image_info()) == baseline_images[1] + 1
    assert session["stamp_placements"][0]["page_no"] == 2
    assert session["pages_base_previews_base64"]

    moved = dict(placement, bbox=[300, 400, 450, 475])
    session = replace_fields_in_session(session, session["fields"], session["static_texts"], [moved])
    assert session["stamp_placements"][0]["bbox"] == [300.0, 400.0, 450.0, 475.0]
    assert len(session["stamps_applied"]) == 1  # moving rebuilds; it never duplicates

    session = replace_fields_in_session(session, session["fields"], session["static_texts"], [])
    restored = fitz.open(stream=session["clean_blank_pdf"], filetype="pdf")
    assert not session["stamp_placements"] and not session["stamps_applied"]
    assert len(restored[1].get_image_info()) == baseline_images[1]
    print("Stamp editor regression passed: add anywhere, cross-page placement, move/resize rebuild, and remove/undo baseline.")


if __name__ == "__main__":
    main()
