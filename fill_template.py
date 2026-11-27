#!/usr/bin/env python3
"""
TemplateCraft sample form filler

Supports:
1. Interactive AcroForm filling
2. Flattened PDF generation
3. Permanent Image / Stamp / Seal embedding at custom coordinates
"""

import argparse
import json
import os
import sys
import fitz
import pypdf


TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "assets", "forms", "sample-template.pdf")
DEFAULT_STAMP_PATH = os.path.join(os.path.dirname(__file__), "assets", "stamps", "demo-stamp.png")
DEMO_SIGNATURE_PATH = os.path.join(os.path.dirname(__file__), "assets", "stamps", "demo-signature.png")


def embed_stamp(doc: fitz.Document, stamp_path: str, rect_coords: list, page_num: int = 0):
    """Permanently embeds an image / stamp into the PDF at rect [x0, y0, x1, y1]."""
    if not os.path.exists(stamp_path):
        print(f"Warning: Stamp file {stamp_path} not found. Skipping stamp embedding.")
        return

    with open(stamp_path, "rb") as f:
        img_bytes = f.read()

    page = doc[page_num]
    r = fitz.Rect(rect_coords)
    page.insert_image(r, stream=img_bytes, keep_proportion=True, overlay=True)
    print(f"Embedded stamp from {stamp_path} at rect {rect_coords}")


def fill_pdf_acroform(
    template_path: str,
    data: dict,
    output_path: str,
    flatten: bool = False,
    stamp_path: str = None,
    stamp_rect: list = None
):
    """
    Fills the PDF using PyMuPDF (fitz) and optionally stamps images and flattens widgets.
    """
    from pathlib import Path
    from app.engine import fill_template_pdf
    source = Path(template_path).read_bytes()
    if stamp_path and stamp_rect:
        doc = fitz.open(stream=source, filetype="pdf")
        embed_stamp(doc, stamp_path, stamp_rect)
        source = doc.tobytes()
        doc.close()
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(fill_template_pdf(source, data, flatten=flatten))
    print(f"Successfully generated: {output_path} (flattened={flatten})")


def main():
    parser = argparse.ArgumentParser(description="Fill a PDF template & embed demo stamps")
    parser.add_argument("--template", default=TEMPLATE_PATH, help="Path to template PDF")
    parser.add_argument("--input", "-i", default=os.path.join(os.path.dirname(__file__), "examples", "sample_data.json"), help="Path to JSON data file (default: bundled fictional example)")
    parser.add_argument("--output", "-o", default=os.path.join(os.path.dirname(__file__), "outputs", "filled_form.pdf"), help="Path to output PDF")
    parser.add_argument("--flatten", action="store_true", help="Flatten form fields into static text")
    parser.add_argument("--stamp", default=None, help="Path to stamp/seal image (e.g. demo-stamp.png or demo-signature.png)")
    parser.add_argument("--stamp-rect", nargs=4, type=float, default=[380, 440, 480, 490],
                        help="Stamp bounding box: x0 y0 x1 y1 (default: 380 440 480 490)")

    args = parser.parse_args()

    if not os.path.exists(args.template):
        print(f"Error: Template not found at {args.template}", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"Error: Input JSON not found at {args.input}", file=sys.stderr)
        sys.exit(1)

    with open(args.input, "r") as f:
        data = json.load(f)

    fill_pdf_acroform(
        args.template,
        data,
        args.output,
        flatten=args.flatten,
        stamp_path=args.stamp,
        stamp_rect=args.stamp_rect
    )


if __name__ == "__main__":
    main()
