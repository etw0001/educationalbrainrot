"""
Flask backend for Educational Brainrot.
Accepts PDF uploads, parses them, and returns structured JSON.
"""

import os
import uuid
import shutil
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir.parent / ".env")
load_dotenv(_backend_dir / ".env")

from parser import parse_pdf
from scriptgen import generate_script, CHARACTER_PRESETS

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


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
        return jsonify({"script": script, "character": character})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
