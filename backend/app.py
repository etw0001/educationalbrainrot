"""
Flask backend for Educational Brainrot.
Accepts PDF uploads, parses them, returns structured JSON,
generates scripts, and produces stitched videos via fal.
"""

import os
import uuid
import shutil
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir.parent / ".env")
load_dotenv(_backend_dir / ".env")

from parser import parse_pdf
from scriptgen import generate_script, chunk_script_by_dialogue, CHARACTER_PRESETS
from videogen import (
    segment_script_for_video,
    submit_all_segments,
    collect_completed_results,
    update_job_status,
    create_job,
    load_job,
    save_job,
)

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


# ── Existing endpoints ────────────────────────────────────────────────────


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/parse", methods=["POST"])
def parse():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted"}), 400

    job_id = uuid.uuid4().hex
    job_dir = os.path.join(UPLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    pdf_path = os.path.join(job_dir, file.filename)
    file.save(pdf_path)

    try:
        result = parse_pdf(pdf_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


@app.route("/api/characters", methods=["GET"])
def characters():
    out = {}
    for key, preset in CHARACTER_PRESETS.items():
        out[key] = {"speakers": preset["speakers"], "style": preset["style"]}
    return jsonify(out)


@app.route("/api/generate-script", methods=["POST"])
def gen_script():
    body = request.get_json(silent=True)
    if not body or "parsed_pdf" not in body:
        return jsonify({"error": "Missing parsed_pdf in request body"}), 400

    character = body.get("character", "stewie_brian")
    max_lines = body.get("max_lines", 14)

    try:
        script = generate_script(
            parsed_pdf=body["parsed_pdf"],
            character_id=character,
            max_lines=max_lines,
        )

        script_chunks = chunk_script_by_dialogue(script, max_chars=300)

        return jsonify({
            "script": script,
            "script_chunks": script_chunks,
            "character": character,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Video generation endpoints ────────────────────────────────────────────


@app.route("/api/generate-video", methods=["POST"])
def generate_video():
    """
    Accept a script + character, segment it, submit all fal jobs,
    and return immediately with a job_id for polling.
    """
    body = request.get_json(silent=True)
    if not body or not body.get("script"):
        return jsonify({"error": "Missing 'script' in request body"}), 400

    script = body["script"]
    character = body.get("character", "stewie_brian")

    if character not in CHARACTER_PRESETS:
        valid = ", ".join(CHARACTER_PRESETS.keys())
        return jsonify({"error": f"Invalid character '{character}'. Valid: {valid}"}), 400

    if not os.environ.get("FAL_KEY"):
        return jsonify({"error": "FAL_KEY is not configured on the server."}), 500

    try:
        segments = segment_script_for_video(script)
        segments_meta = submit_all_segments(segments, character)

        # If any segment failed at submission time, report it
        submission_failures = [s for s in segments_meta if s["fal_status"] == "failed"]
        if submission_failures:
            return jsonify({
                "error": f"{len(submission_failures)} segment(s) failed to submit.",
                "details": [s.get("error", "") for s in submission_failures],
            }), 500

        job = create_job(script, character, segments, segments_meta)

        return jsonify({
            "job_id": job["job_id"],
            "status": job["status"],
            "segment_count": len(segments),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/video-status/<job_id>", methods=["GET"])
def video_status(job_id: str):
    """
    Poll fal for progress on all non-terminal segments.
    If everything completed, download + normalize + stitch automatically.
    """
    job = load_job(job_id)
    if job is None:
        return jsonify({"error": f"Job '{job_id}' not found."}), 404

    # Poll fal for any segments still in flight.
    # "completed" is the only truly terminal state — even "failed" jobs get
    # re-evaluated in case they can recover from a post-processing error.
    if job["status"] != "completed":
        collect_completed_results(job["segments"])
        update_job_status(job)

    completed = sum(1 for s in job["segments"] if s["fal_status"] == "completed")
    total = len(job["segments"])

    return jsonify({
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": {
            "completed_segments": completed,
            "total_segments": total,
        },
        "segments": [
            {
                "segment_index": s["segment_index"],
                "fal_status": s["fal_status"],
                "duration_sec": s["duration_sec"],
                "text": s["text"],
                "video_url": s.get("video_url"),
                "error": s.get("error"),
            }
            for s in job["segments"]
        ],
        "final_video_url": f"/api/video-result/{job_id}" if job["status"] == "completed" else None,
        "error": job.get("error"),
    })


@app.route("/api/video-result/<job_id>", methods=["GET"])
def video_result(job_id: str):
    """Serve the stitched final MP4 if the job is complete."""
    job = load_job(job_id)
    if job is None:
        return jsonify({"error": f"Job '{job_id}' not found."}), 404

    final_path = job.get("final_video_path")
    if not final_path or not Path(final_path).exists():
        return jsonify({"error": "Video not ready yet or job failed."}), 404

    return send_file(
        final_path,
        mimetype="video/mp4",
        as_attachment=True,
        download_name=f"brainrot_{job_id}.mp4",
    )


if __name__ == "__main__":
    app.run(debug=True, port=5001)
