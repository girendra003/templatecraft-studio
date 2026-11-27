"""
FastAPI Server for PDF Template Modification & Field Extraction Studio
Includes Signzy Schema Export, Permanent Image Stamping, and Drawing Features
"""

import os
import io
import uuid
import base64
import json
import hashlib
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.engine import (
    analyze_and_process_pdf,
    fill_template_pdf,
    render_page_preview,
    render_all_pages_previews,
    render_all_visual_maps,
    apply_stamp_to_session,
    update_field_coordinates_in_session,
    delete_field_from_session,
    replace_fields_in_session,
    build_acroform_template,
    render_visual_map,
    create_bundle_zip,
    generate_signzy_schema,
)

app = FastAPI(
    title="TemplateCraft Studio",
    description="Automated PDF Template Cleaner, Field Extractor, AcroForm Generator, Signzy Schema Exporter & Stamp Burner",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS: Dict[str, Dict[str, Any]] = {}

REACT_DIST_DIR = os.path.join(os.path.dirname(__file__), "react_dist")
SAMPLE_PDF_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "forms", "sample-template.pdf")
DEFAULT_STAMP_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "stamps", "demo-stamp.png")
DEMO_SIGNATURE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "stamps", "demo-signature.png")


class FillRequest(BaseModel):
    data: Dict[str, Any]
    flatten: bool = True
    match_source_format: bool = True


class StampBurnRequest(BaseModel):
    session_id: str
    rect: List[float]  # [x0, y0, x1, y1]
    image_base64: Optional[str] = None
    stamp_id: Optional[str] = None  # "demo-stamp.png" or "demo-signature.png"
    stamp_name: Optional[str] = None  # Friendly or custom filename
    target_key: Optional[str] = None  # E.g. applicant_wet_sign_af_image
    keep_proportion: bool = True
    page_no: Optional[int] = 1


class UpdateFieldCoordRequest(BaseModel):
    session_id: str
    key: str
    rect: Optional[List[float]] = None  # [x0, y0, x1, y1]
    dimensions: Optional[Dict[str, float]] = None  # {"xCoordinate": ..., "yCoordinate": ..., "width": ..., "height": ...}
    page_no: Optional[int] = 1


class BulkUpdateCoordsRequest(BaseModel):
    session_id: str
    fields_coords: Dict[str, Any]  # e.g. {"applicant_wet_sign_af_image": {"xCoordinate": 420, "yCoordinate": 442, "width": 138, "height": 139}}


class DeleteFieldRequest(BaseModel):
    session_id: str
    key: str


class ReplaceFieldsRequest(BaseModel):
    session_id: str
    fields: List[Dict[str, Any]]
    static_texts: Optional[List[Dict[str, Any]]] = None
    stamp_placements: Optional[List[Dict[str, Any]]] = None


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/fields/update-coord")
async def update_field_coord(req: UpdateFieldCoordRequest):
    """Updates the bounding box coordinates of any existing or custom field."""
    session_id = req.session_id
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSIONS[session_id]

    if req.dimensions:
        x0 = float(req.dimensions.get("xCoordinate", 0))
        y0 = float(req.dimensions.get("yCoordinate", 0))
        w = float(req.dimensions.get("width", 100))
        h = float(req.dimensions.get("height", 50))
        target_rect = [x0, y0, x0 + w, y0 + h]
    elif req.rect and len(req.rect) == 4:
        target_rect = [float(c) for c in req.rect]
    else:
        raise HTTPException(status_code=400, detail="Invalid coordinates. Provide 'rect': [x0, y0, x1, y1] or 'dimensions': {'xCoordinate', 'yCoordinate', 'width', 'height'}")

    try:
        updated_session = update_field_coordinates_in_session(
            session, req.key, tuple(target_rect), page_no=req.page_no or 1
        )
        SESSIONS[session_id] = updated_session

        return {
            "success": True,
            "message": f"Updated coordinates for {req.key}",
            "key": req.key,
            "rect": target_rect,
            "page_no": req.page_no or 1,
            "dimensions": {
                "xCoordinate": round(target_rect[0]),
                "yCoordinate": round(target_rect[1]),
                "width": round(target_rect[2] - target_rect[0]),
                "height": round(target_rect[3] - target_rect[1])
            },
            "fields": updated_session["fields"],
            "signzy_schema": updated_session["signzy_schema"],
            "visual_map_base64": base64.b64encode(updated_session["visual_map_png"]).decode("utf-8"),
            "pages_visual_maps_base64": updated_session.get("pages_visual_maps_base64", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating coordinates: {str(e)}")


@app.post("/api/fields/delete")
async def delete_field(req: DeleteFieldRequest):
    """Deletes one field and regenerates the template, maps, schema, and bundle."""
    if req.session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not req.key.strip():
        raise HTTPException(status_code=400, detail="Field key is required.")

    try:
        updated_session = delete_field_from_session(SESSIONS[req.session_id], req.key)
        SESSIONS[req.session_id] = updated_session
        return {
            "success": True,
            "message": f"Deleted field {req.key}",
            "deleted_key": req.key,
            "total_fields": updated_session["total_fields"],
            "fields": updated_session["fields"],
            "sample_data": updated_session.get("sample_data", {}),
            "signzy_schema": updated_session["signzy_schema"],
            "visual_map_base64": base64.b64encode(updated_session["visual_map_png"]).decode("utf-8"),
            "pages_visual_maps_base64": updated_session.get("pages_visual_maps_base64", []),
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Field not found: {req.key}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting field: {str(e)}")


@app.post("/api/fields/replace")
async def replace_fields(req: ReplaceFieldsRequest):
    """Atomically commits the complete field state from the browser editor."""
    if req.session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        updated_session = replace_fields_in_session(SESSIONS[req.session_id], req.fields, req.static_texts, req.stamp_placements)
        SESSIONS[req.session_id] = updated_session
        return {
            "success": True,
            "message": f"Saved {updated_session['total_fields']} fields",
            "total_fields": updated_session["total_fields"],
            "fields": updated_session["fields"],
            "static_texts": updated_session.get("static_texts", []),
            "sample_data": updated_session.get("sample_data", {}),
            "signzy_schema": updated_session["signzy_schema"],
            "visual_map_base64": base64.b64encode(updated_session["visual_map_png"]).decode("utf-8"),
            "pages_visual_maps_base64": updated_session.get("pages_visual_maps_base64", []),
            "pages_previews_base64": updated_session.get("pages_previews_base64", []),
            "pages_base_previews_base64": updated_session.get("pages_base_previews_base64", []),
            "stamp_placements": updated_session.get("stamp_placements", []),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error saving fields: {str(exc)}")


@app.post("/api/fields/bulk-update-coords")
async def bulk_update_coords(req: BulkUpdateCoordsRequest):
    """Updates multiple image/signature field coordinates simultaneously."""
    session_id = req.session_id
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSIONS[session_id]
    try:
        updated_session = session
        for key, coord_data in req.fields_coords.items():
            if isinstance(coord_data, list) and len(coord_data) == 4:
                rect = tuple(coord_data)
            elif isinstance(coord_data, dict):
                dim = coord_data.get("dimensions", coord_data)
                x0 = float(dim.get("xCoordinate", 0))
                y0 = float(dim.get("yCoordinate", 0))
                w = float(dim.get("width", 100))
                h = float(dim.get("height", 50))
                rect = (x0, y0, x0 + w, y0 + h)
            else:
                continue
            updated_session = update_field_coordinates_in_session(updated_session, key, rect)

        SESSIONS[session_id] = updated_session
        return {
            "success": True,
            "message": f"Updated {len(req.fields_coords)} field coordinates",
            "fields": updated_session["fields"],
            "signzy_schema": updated_session["signzy_schema"],
            "visual_map_base64": base64.b64encode(updated_session["visual_map_png"]).decode("utf-8")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error bulk updating coordinates: {str(e)}")


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Uploads and analyzes a PDF form to extract fields and create fresh template."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = analyze_and_process_pdf(content)
        session_id = str(uuid.uuid4())
        SESSIONS[session_id] = result

        return {
            "success": True,
            "session_id": session_id,
            "filename": file.filename,
            "form_type": result.get("form_type"),
            "page_count": result.get("page_count", 1),
            "total_fields": result["total_fields"],
            "fields": result["fields"],
            "static_texts": result.get("static_texts", []),
            "signzy_schema": result["signzy_schema"],
            "sample_data": result["sample_data"],
            "visual_map_base64": base64.b64encode(result["visual_map_png"]).decode("utf-8"),
            "preview_base64": base64.b64encode(result["preview_png"]).decode("utf-8"),
            "pages_previews_base64": result.get("pages_previews_base64", []),
            "pages_base_previews_base64": result.get("pages_base_previews_base64", result.get("pages_previews_base64", [])),
            "stamp_placements": result.get("stamp_placements", []),
            "pages_visual_maps_base64": result.get("pages_visual_maps_base64", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.get("/api/sample")
async def load_sample(kind: str = "sample"):
    """Loads one of the bundled example forms."""
    if kind != "sample":
        raise HTTPException(status_code=400, detail="Unknown sample form.")
    sample_path = SAMPLE_PDF_PATH
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample PDF not found.")

    with open(sample_path, "rb") as f:
        content = f.read()

    result = analyze_and_process_pdf(content)
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = result

    return {
        "success": True,
        "session_id": session_id,
        "filename": os.path.basename(sample_path),
        "form_type": result.get("form_type"),
        "page_count": result.get("page_count", 1),
        "total_fields": result["total_fields"],
        "fields": result["fields"],
        "static_texts": result.get("static_texts", []),
        "signzy_schema": result["signzy_schema"],
        "sample_data": result["sample_data"],
        "visual_map_base64": base64.b64encode(result["visual_map_png"]).decode("utf-8"),
        "preview_base64": base64.b64encode(result["preview_png"]).decode("utf-8"),
        "pages_previews_base64": result.get("pages_previews_base64", []),
        "pages_base_previews_base64": result.get("pages_base_previews_base64", result.get("pages_previews_base64", [])),
        "stamp_placements": result.get("stamp_placements", []),
        "pages_visual_maps_base64": result.get("pages_visual_maps_base64", [])
    }


@app.get("/api/stamp/default")
async def get_default_stamp():
    """Returns the default seal image (demo-stamp.png) as base64 for frontend canvas drawing."""
    if not os.path.exists(DEFAULT_STAMP_PATH):
        raise HTTPException(status_code=404, detail="Default stamp not found.")

    with open(DEFAULT_STAMP_PATH, "rb") as f:
        img_bytes = f.read()

    return {
        "success": True,
        "filename": "demo-stamp.png",
        "image_base64": base64.b64encode(img_bytes).decode("utf-8")
    }


@app.get("/api/stamp/list")
async def get_stamps_list():
    """Returns unique seal/signature image assets, deduplicated by file content."""
    stamps = []
    seen_hashes = set()
    catalog = [
        (DEFAULT_STAMP_PATH, "demo-stamp.png", "Demo Stamp", "image/png"),
        (DEMO_SIGNATURE_PATH, "demo-signature.png", "Demo Signature", "image/png"),
    ]
    for path, asset_id, label, mime_type in catalog:
        if not os.path.exists(path):
            continue
        with open(path, "rb") as stamp_file:
            image_bytes = stamp_file.read()
        digest = hashlib.sha256(image_bytes).hexdigest()
        if digest in seen_hashes:
            continue
        seen_hashes.add(digest)
        stamps.append({
            "id": asset_id,
            "label": label,
            "filename": os.path.basename(path),
            "mime_type": mime_type,
            "image_base64": base64.b64encode(image_bytes).decode("utf-8"),
        })
    return {"success": True, "stamps": stamps}


@app.post("/api/stamp/burn")
async def burn_stamp(req: StampBurnRequest):
    """
    Permanently burns/stamps an image into the PDF template at the defined coordinates.
    Updates the template, AcroForm fields, visual map, and preview images.
    """
    session_id = req.session_id
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSIONS[session_id]

    if req.image_base64 and len(req.image_base64) > 0:
        raw_b64 = req.image_base64.split(",")[-1]
        img_bytes = base64.b64decode(raw_b64)
    elif req.stamp_id == "demo-signature.png" and os.path.exists(DEMO_SIGNATURE_PATH):
        with open(DEMO_SIGNATURE_PATH, "rb") as f:
            img_bytes = f.read()
    else:
        target_path = DEMO_SIGNATURE_PATH if req.stamp_id == "demo-signature.png" else DEFAULT_STAMP_PATH
        if not os.path.exists(target_path):
            raise HTTPException(status_code=404, detail="Seal image not found.")
        with open(target_path, "rb") as f:
            img_bytes = f.read()

    rect = tuple(req.rect)
    if len(rect) != 4:
        raise HTTPException(status_code=400, detail="Invalid rect. Expected [x0, y0, x1, y1]")

    try:
        updated_session = apply_stamp_to_session(
            session,
            img_bytes,
            rect,
            keep_proportion=req.keep_proportion,
            stamp_name=req.stamp_name or req.stamp_id or "Seal",
            target_key=req.target_key,
            page_no=req.page_no or 1
        )
        SESSIONS[session_id] = updated_session

        return {
            "success": True,
            "message": "Stamp permanently embedded into template!",
            "rect": req.rect,
            "page_no": req.page_no or 1,
            "signzy_schema": updated_session["signzy_schema"],
            "visual_map_base64": base64.b64encode(updated_session["visual_map_png"]).decode("utf-8"),
            "preview_base64": base64.b64encode(updated_session["preview_png"]).decode("utf-8"),
            "pages_visual_maps_base64": updated_session.get("pages_visual_maps_base64", []),
            "pages_previews_base64": updated_session.get("pages_previews_base64", []),
            "page_count": updated_session.get("page_count", 1),
            "stamps_count": len(updated_session.get("stamps_applied", [])),
            "stamps_applied": updated_session.get("stamps_applied", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error embedding stamp: {str(e)}")


@app.post("/api/stamp/reset/{session_id}")
async def reset_stamps(session_id: str):
    """Resets the template back to the original clean unstamped state."""
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSIONS[session_id]
    original_blank = session.get("original_blank_pdf", session["clean_blank_pdf"])
    # Reset only burned stamps. Keep the user's moved, resized, added, and
    # deleted fields intact when rebuilding the AcroForm.
    fields_def = session.get("fields", [])

    template = build_acroform_template(original_blank, fields_def)
    all_visual_maps = render_all_visual_maps(original_blank, fields_def)
    all_previews = render_all_pages_previews(original_blank)
    signzy_schema = generate_signzy_schema(session["fields"], stamps_applied=None, page_no=1)

    session["clean_blank_pdf"] = original_blank
    session["editable_template_pdf"] = template
    session["visual_map_png"] = all_visual_maps[0] if all_visual_maps else b""
    session["preview_png"] = all_previews[0] if all_previews else b""
    session["pages_visual_maps_base64"] = [base64.b64encode(m).decode("utf-8") for m in all_visual_maps]
    session["pages_previews_base64"] = [base64.b64encode(p).decode("utf-8") for p in all_previews]
    session["stamps_applied"] = []
    session["signzy_schema"] = signzy_schema
    session["bundle_zip"] = create_bundle_zip(
        template,
        original_blank,
        session["visual_map_png"],
        {"total_fields": session["total_fields"], "fields": session["fields"]},
        signzy_schema,
        session["sample_data"]
    )

    return {
        "success": True,
        "message": "Template reset to original blank state.",
        "signzy_schema": signzy_schema,
        "visual_map_base64": base64.b64encode(session["visual_map_png"]).decode("utf-8"),
        "preview_base64": base64.b64encode(session["preview_png"]).decode("utf-8"),
        "pages_visual_maps_base64": session["pages_visual_maps_base64"],
        "pages_previews_base64": session["pages_previews_base64"],
        "stamps_count": 0,
        "stamps_applied": []
    }


@app.get("/api/download/{session_id}/{file_type}")
async def download_file(session_id: str, file_type: str):
    """Downloads fresh editable PDF, blank vector PDF, JSON schema, or ZIP bundle."""
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session expired or not found.")

    session = SESSIONS[session_id]

    if file_type == "template":
        return Response(
            content=session["editable_template_pdf"],
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=template.pdf"}
        )
    elif file_type == "blank":
        return Response(
            content=session["clean_blank_pdf"],
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=blank.pdf"}
        )
    elif file_type == "visual_map":
        return Response(
            content=session["visual_map_png"],
            media_type="image/png",
            headers={"Content-Disposition": "attachment; filename=field_coordinates_map.png"}
        )
    elif file_type == "fields_json":
        json_data = json.dumps({"total_fields": session["total_fields"], "fields": session["fields"]}, indent=2)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=fields_mapping.json"}
        )
    elif file_type == "signzy_json":
        json_data = json.dumps(session.get("signzy_schema", {}), indent=2)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=signzy_editables_schema.json"}
        )
    elif file_type == "sample_json":
        json_data = json.dumps(session["sample_data"], indent=2)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=sample_data.json"}
        )
    elif file_type == "bundle":
        return Response(
            content=session["bundle_zip"],
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=template_assets_bundle.zip"}
        )
    else:
        raise HTTPException(status_code=400, detail="Unknown file type.")


@app.post("/api/fill-test/{session_id}")
async def fill_test(session_id: str, req: FillRequest):
    """Fills the fresh template with user-supplied data in real time."""
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSIONS[session_id]
    template_bytes = session["editable_template_pdf"]

    try:
        filled_bytes = fill_template_pdf(
            template_bytes,
            req.data,
            flatten=req.flatten,
            fields_def=session.get("fields", []),
            match_source_format=req.match_source_format,
        )
        all_previews = render_all_pages_previews(filled_bytes)
        preview_png = all_previews[0] if all_previews else b""
        pages_previews_base64 = [base64.b64encode(p).decode("utf-8") for p in all_previews]

        return {
            "success": True,
            "pdf_base64": base64.b64encode(filled_bytes).decode("utf-8"),
            "preview_base64": base64.b64encode(preview_png).decode("utf-8"),
            "pages_previews_base64": pages_previews_base64,
            "page_count": len(all_previews)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fill error: {str(e)}")


if os.path.exists(REACT_DIST_DIR):
    app.mount("/", StaticFiles(directory=REACT_DIST_DIR, html=True), name="react_frontend")
