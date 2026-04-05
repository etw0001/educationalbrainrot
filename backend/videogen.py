"""
Video generation pipeline.

Takes a generated script, segments it by estimated spoken duration,
submits each segment to fal's queue-based text-to-video API,
polls for completion, downloads clips, and stitches them into one MP4.
"""

import json
import math
import os
import re
import shutil
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

try:
    import fal_client
except ImportError:
    fal_client = None  # type: ignore[assignment]

from scriptgen import CHARACTER_PRESETS

# ---------------------------------------------------------------------------
# Config — read from env with sensible defaults
# ---------------------------------------------------------------------------

FAL_VIDEO_MODEL = os.environ.get(
    "FAL_VIDEO_MODEL", "fal-ai/kling-video/v3/standard/text-to-video"
)
SEGMENT_TARGET_SECONDS = float(os.environ.get("VIDEO_SEGMENT_TARGET_SECONDS", "10"))
WORDS_PER_SECOND = float(os.environ.get("VIDEO_WORDS_PER_SECOND", "2.2"))

VIDEO_JOBS_DIR = Path(__file__).resolve().parent / "uploads" / "video_jobs"
VIDEO_JOBS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Visual style mapping — one per character preset
# ---------------------------------------------------------------------------

CHARACTER_VISUAL_STYLES: dict[str, dict[str, str]] = {
    "stewie_brian": {
        "setting": "a modern living room with a whiteboard, sitcom lighting, warm tones",
        "look": "3D animated Pixar-style characters, expressive faces, comedic body language",
        "tone": "witty educational comedy, snappy timing, meme energy",
    },
    "spongebob_squidward": {
        "setting": "a colorful underwater classroom with a chalkboard and bubbles",
        "look": "bright saturated 2D-style animation, exaggerated expressions, cartoon physics",
        "tone": "chaotic educational comedy, over-the-top reactions, absurd humor",
    },
    "shrek_donkey": {
        "setting": "a cozy swamp cottage with a campfire at dusk, fantasy forest background",
        "look": "cinematic fantasy CG animation, lush greenery, warm firelight, expressive characters",
        "tone": "grumpy-wholesome comedy, fairy-tale parody energy, loud reactions",
    },
    "batman_robin": {
        "setting": "a dark Gotham rooftop at night, city lights below, dramatic fog",
        "look": "cinematic comic-book style, dramatic shadows, high contrast, heroic poses",
        "tone": "intense dramatic comedy, deadpan meets confused, noir meme energy",
    },
    "tony_peter": {
        "setting": "a high-tech lab with holographic screens, sleek modern interior",
        "look": "stylized 3D animation, clean sci-fi aesthetic, glowing UI elements",
        "tone": "smug genius meets lovable idiot, fast-paced witty banter, nerd comedy",
    },
    "walter_jesse": {
        "setting": "a dusty chemistry lab with beakers and fumes, harsh fluorescent lighting",
        "look": "gritty cinematic realism, desaturated tones, tense close-ups, dramatic angles",
        "tone": "intense over-explanation meets overwhelmed panic, dark comedy energy",
    },
}

# Fallback if character_id not in the visual map
_DEFAULT_VISUAL = {
    "setting": "a modern classroom with a projector screen",
    "look": "clean 3D animation, expressive characters, bright lighting",
    "tone": "educational comedy, entertaining and clear",
}

# ---------------------------------------------------------------------------
# A. Script segmentation by estimated spoken duration
# ---------------------------------------------------------------------------


def _word_count(text: str) -> int:
    return len(text.split())


def _estimate_duration(text: str, wps: float = WORDS_PER_SECOND) -> float:
    """Estimate spoken duration in seconds."""
    return _word_count(text) / wps


def _split_long_line(line: str, target_words: int) -> list[str]:
    """
    Split a single dialogue line that exceeds target_words.
    Prefer sentence boundaries (. ? ! ,), fall back to hard word split.
    """
    # Try splitting on sentence-ending punctuation first
    parts = re.split(r"(?<=[.?!,])\s+", line)
    if len(parts) > 1:
        merged: list[str] = []
        buf = ""
        for p in parts:
            candidate = (buf + " " + p).strip() if buf else p
            if _word_count(candidate) <= target_words:
                buf = candidate
            else:
                if buf:
                    merged.append(buf)
                buf = p
        if buf:
            merged.append(buf)
        if len(merged) > 1:
            return merged

    # Hard split by words
    words = line.split()
    chunks: list[str] = []
    for i in range(0, len(words), target_words):
        chunks.append(" ".join(words[i : i + target_words]))
    return chunks


def segment_script_for_video(
    script: str,
    target_seconds: float = SEGMENT_TARGET_SECONDS,
    words_per_second: float = WORDS_PER_SECOND,
) -> list[dict[str, Any]]:
    """
    Break a dialogue script into ordered video segments of ~target_seconds each.
    Returns list of segment dicts with timing metadata.
    """
    target_words = int(target_seconds * words_per_second)

    # Parse into individual dialogue lines (skip blanks / @ markers from the LLM)
    raw_lines = [
        ln.strip()
        for ln in script.splitlines()
        if ln.strip() and ln.strip() != "@"
    ]

    # Expand lines that are too long
    expanded: list[str] = []
    for line in raw_lines:
        if _word_count(line) > target_words * 1.5:
            expanded.extend(_split_long_line(line, target_words))
        else:
            expanded.append(line)

    # Group lines into segments
    segments: list[dict[str, Any]] = []
    buf_lines: list[str] = []
    buf_words = 0
    clock = 0.0

    def _flush() -> None:
        nonlocal buf_lines, buf_words, clock
        if not buf_lines:
            return
        text = "\n".join(buf_lines)
        dur = buf_words / words_per_second
        segments.append(
            {
                "segment_index": len(segments),
                "start_sec": round(clock, 2),
                "end_sec": round(clock + dur, 2),
                "duration_sec": round(dur, 2),
                "text": text,
                "estimated_words": buf_words,
            }
        )
        clock += dur
        buf_lines = []
        buf_words = 0

    for line in expanded:
        wc = _word_count(line)
        if buf_words + wc > target_words and buf_lines:
            _flush()
        buf_lines.append(line)
        buf_words += wc

    _flush()
    return segments


# ---------------------------------------------------------------------------
# B. Visual prompt builder
# ---------------------------------------------------------------------------


def build_video_prompt(
    segment: dict[str, Any],
    character_id: str,
    total_segments: int,
) -> str:
    """
    Build a text-to-video prompt for one segment that keeps visual continuity
    across the whole video.
    """
    preset = CHARACTER_PRESETS.get(character_id, {})
    speakers = preset.get("speakers", ["Character A", "Character B"])
    style_info = CHARACTER_VISUAL_STYLES.get(character_id, _DEFAULT_VISUAL)

    idx = segment["segment_index"]
    position = "opening" if idx == 0 else ("closing" if idx == total_segments - 1 else "middle")

    prompt_parts = [
        f"Scene {idx + 1} of {total_segments} ({position} segment) of a short comedic educational video.",
        f"Setting: {style_info['setting']}.",
        f"Visual style: {style_info['look']}.",
        f"Tone: {style_info['tone']}.",
        f"Characters present: {speakers[0]} and {speakers[1]}, talking to each other.",
        "The characters are animated, expressive, and react to what they are saying.",
        f"This segment is approximately {segment['duration_sec']:.0f} seconds long.",
        "",
        "Dialogue being spoken in this segment:",
        segment["text"],
        "",
        "Keep visual continuity with adjacent segments: same characters, same setting, same lighting, same art style.",
    ]
    return "\n".join(prompt_parts)


# ---------------------------------------------------------------------------
# C. Fal queue submission
# ---------------------------------------------------------------------------


def _ensure_fal() -> None:
    if fal_client is None:
        raise RuntimeError(
            "fal-client is not installed. Run: pip install fal-client"
        )
    if not os.environ.get("FAL_KEY"):
        raise RuntimeError("FAL_KEY environment variable is not set.")


def submit_segment_job(
    segment: dict[str, Any],
    character_id: str,
    total_segments: int,
    model: str = FAL_VIDEO_MODEL,
) -> dict[str, Any]:
    """Submit one segment to fal and return tracking metadata."""
    _ensure_fal()

    prompt = build_video_prompt(segment, character_id, total_segments)

    request_handle = fal_client.submit(
        model,
        arguments={
            "prompt": prompt,
            "duration": "10",
            "aspect_ratio": "16:9",
        },
    )

    return {
        "segment_index": segment["segment_index"],
        "fal_request_id": request_handle.request_id,
        "fal_status": "queued",
        "prompt": prompt,
        "text": segment["text"],
        "duration_sec": segment["duration_sec"],
        "video_url": None,
        "local_path": None,
    }


def submit_all_segments(
    segments: list[dict[str, Any]],
    character_id: str,
    model: str = FAL_VIDEO_MODEL,
) -> list[dict[str, Any]]:
    """Submit every segment and return ordered tracking list."""
    _ensure_fal()
    total = len(segments)
    results: list[dict[str, Any]] = []
    for seg in segments:
        try:
            meta = submit_segment_job(seg, character_id, total, model=model)
        except Exception as exc:
            meta = {
                "segment_index": seg["segment_index"],
                "fal_request_id": None,
                "fal_status": "failed",
                "prompt": "",
                "text": seg["text"],
                "duration_sec": seg["duration_sec"],
                "video_url": None,
                "local_path": None,
                "error": str(exc),
            }
        results.append(meta)
    return results


# ---------------------------------------------------------------------------
# D. Polling helpers
# ---------------------------------------------------------------------------


def poll_segment_job(
    segment_meta: dict[str, Any],
    model: str = FAL_VIDEO_MODEL,
) -> dict[str, Any]:
    """
    Check the current status of one fal request.
    Mutates and returns the segment_meta dict.
    """
    _ensure_fal()
    rid = segment_meta.get("fal_request_id")
    if not rid or segment_meta["fal_status"] in ("completed", "failed"):
        return segment_meta

    try:
        status = fal_client.status(model, rid, with_logs=False)
        status_type = type(status).__name__

        if status_type == "Completed":
            result = fal_client.result(model, rid)
            video_url = None
            if isinstance(result, dict):
                video_obj = result.get("video")
                if isinstance(video_obj, dict):
                    video_url = video_obj.get("url")
                elif isinstance(video_obj, str):
                    video_url = video_obj
            segment_meta["fal_status"] = "completed"
            segment_meta["video_url"] = video_url
        elif status_type == "InProgress":
            segment_meta["fal_status"] = "in_progress"
        elif status_type == "InQueue":
            segment_meta["fal_status"] = "queued"
        else:
            segment_meta["fal_status"] = "unknown"

    except Exception as exc:
        segment_meta["fal_status"] = "failed"
        segment_meta["error"] = str(exc)

    return segment_meta


def collect_completed_results(
    segments_meta: list[dict[str, Any]],
    model: str = FAL_VIDEO_MODEL,
) -> list[dict[str, Any]]:
    """Poll all non-terminal segments and return the updated list."""
    for seg in segments_meta:
        if seg["fal_status"] not in ("completed", "failed"):
            poll_segment_job(seg, model=model)
    return segments_meta


# ---------------------------------------------------------------------------
# E. Download + normalize + stitch
# ---------------------------------------------------------------------------


def _check_ffmpeg() -> str:
    """Return the ffmpeg binary path or raise with a helpful message."""
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError(
            "ffmpeg is not installed or not on PATH. "
            "Install it (e.g. `brew install ffmpeg` on macOS) and try again."
        )
    return path


def download_video(url: str, dest_path: str | Path, timeout: int = 120) -> Path:
    """Download a video file from a URL to dest_path."""
    dest = Path(dest_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    resp = requests.get(url, stream=True, timeout=timeout)
    resp.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return dest


def normalize_clip(input_path: str | Path, output_path: str | Path) -> Path:
    """
    Re-encode a clip to a consistent format so concat works reliably.
    Output: H.264 mp4, 30fps, yuv420p, AAC audio (or silent).
    """
    ffmpeg = _check_ffmpeg()
    inp = Path(input_path)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Explicit stream mapping: fal Kling clips sometimes have audio as stream 0
    # and video as stream 1, which confuses positional codec flags.
    cmd = [
        ffmpeg, "-y",
        "-i", str(inp),
        "-map", "0:v:0",
        "-map", "0:a:0?",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ac", "2",
        "-ar", "44100",
        "-movflags", "+faststart",
        str(out),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg normalize failed: {result.stderr[-500:]}")
    return out


def stitch_video_segments(segment_paths: list[str], output_path: str) -> str:
    """
    Concatenate segment clips (already normalized) into one final MP4.
    Uses the ffmpeg concat *filter* (not demuxer) to fully decode each clip
    before joining — avoids NAL unit / bitstream errors at file boundaries.
    """
    ffmpeg = _check_ffmpeg()
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    n = len(segment_paths)
    cmd: list[str] = [ffmpeg, "-y"]

    for p in segment_paths:
        cmd += ["-i", str(Path(p).resolve())]

    # Build the filter_complex: [0:v][0:a][1:v][1:a]...concat=n=N:v=1:a=1
    filter_inputs = "".join(f"[{i}:v][{i}:a]" for i in range(n))
    filter_str = f"{filter_inputs}concat=n={n}:v=1:a=1[outv][outa]"

    cmd += [
        "-filter_complex", filter_str,
        "-map", "[outv]",
        "-map", "[outa]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        str(out),
    ]
    # Filter-based concat re-encodes everything, so allow generous time
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=1200)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg stitch failed: {result.stderr[-500:]}")
    return str(out)


# ---------------------------------------------------------------------------
# Job state management (file-based JSON)
# ---------------------------------------------------------------------------


def _job_dir(job_id: str) -> Path:
    return VIDEO_JOBS_DIR / job_id


def _job_file(job_id: str) -> Path:
    return _job_dir(job_id) / "job.json"


def create_job(
    script: str,
    character_id: str,
    segments: list[dict[str, Any]],
    segments_meta: list[dict[str, Any]],
) -> dict[str, Any]:
    """Create a new video job and persist it to disk."""
    job_id = uuid.uuid4().hex[:12]
    jdir = _job_dir(job_id)
    jdir.mkdir(parents=True, exist_ok=True)

    job = {
        "job_id": job_id,
        "character": character_id,
        "script": script,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "queued",
        "segments": segments_meta,
        "final_video_path": None,
        "error": None,
    }
    save_job(job)
    return job


def save_job(job: dict[str, Any]) -> None:
    jf = _job_file(job["job_id"])
    jf.parent.mkdir(parents=True, exist_ok=True)
    with open(jf, "w", encoding="utf-8") as f:
        json.dump(job, f, indent=2, ensure_ascii=False)


def load_job(job_id: str) -> dict[str, Any] | None:
    jf = _job_file(job_id)
    if not jf.exists():
        return None
    with open(jf, "r", encoding="utf-8") as f:
        return json.load(f)


def update_job_status(job: dict[str, Any]) -> dict[str, Any]:
    """
    Derive the overall job status from segment statuses.
    If all completed -> try to download + stitch.
    If any failed -> mark job failed.
    Otherwise -> running.
    """
    segs = job["segments"]
    statuses = [s["fal_status"] for s in segs]

    if any(s == "failed" for s in statuses):
        failed_indices = [
            s["segment_index"] for s in segs if s["fal_status"] == "failed"
        ]
        job["status"] = "failed"
        job["error"] = f"Segment(s) {failed_indices} failed."
        save_job(job)
        return job

    if all(s == "completed" for s in statuses):
        final = job.get("final_video_path")
        if final and Path(final).exists():
            job["status"] = "completed"
            job["error"] = None
        else:
            try:
                _download_and_stitch(job)
                job["status"] = "completed"
                job["error"] = None
            except Exception as exc:
                # Post-processing (download/normalize/stitch) failed.
                # Keep as "running" so the next poll retries instead of
                # permanently marking the job failed.
                job["status"] = "running"
                job["error"] = f"Post-processing attempt failed (will retry): {exc}"
    else:
        job["status"] = "running"

    save_job(job)
    return job


def _download_and_stitch(job: dict[str, Any]) -> None:
    """Download all segment videos, normalize, and stitch."""
    jdir = _job_dir(job["job_id"])
    clips_dir = jdir / "clips"
    clips_dir.mkdir(exist_ok=True)
    norm_dir = jdir / "normalized"
    norm_dir.mkdir(exist_ok=True)

    sorted_segs = sorted(job["segments"], key=lambda s: s["segment_index"])
    normalized_paths: list[str] = []

    for seg in sorted_segs:
        url = seg.get("video_url")
        if not url:
            raise RuntimeError(
                f"Segment {seg['segment_index']} has no video URL."
            )

        raw_path = clips_dir / f"seg_{seg['segment_index']:03d}.mp4"
        if not raw_path.exists() or raw_path.stat().st_size == 0:
            download_video(url, raw_path)
        seg["local_path"] = str(raw_path)

        norm_path = norm_dir / f"seg_{seg['segment_index']:03d}.mp4"
        if not norm_path.exists() or norm_path.stat().st_size == 0:
            normalize_clip(raw_path, norm_path)
        normalized_paths.append(str(norm_path))

    final_path = jdir / "final.mp4"
    stitch_video_segments(normalized_paths, str(final_path))
    job["final_video_path"] = str(final_path)
