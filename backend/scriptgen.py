"""
Script generator — turns parsed PDF JSON into a two-character brainrot dialogue
using the OpenAI API.
"""

import json
import os
from typing import Any, Dict, List

from openai import OpenAI

CHARACTER_PRESETS: Dict[str, Dict[str, Any]] = {
    "stewie_brian": {
        "speakers": ["Stewie", "Brian"],
        "style": "Stewie is dramatic, hyper-intelligent, sarcastic, and funny. Brian is the grounded straight man reacting to how ridiculous everything sounds.",
    },
    "spongebob_squidward": {
        "speakers": ["SpongeBob", "Squidward"],
        "style": "SpongeBob is chaotic, excited, and over-the-top. Squidward is dry, annoyed, and keeps reacting like this is the dumbest explanation ever.",
    },
    "shrek_donkey": {
        "speakers": ["Shrek", "Donkey"],
        "style": "Shrek is blunt and grumpy. Donkey is loud, interruptive, and full of chaotic energy.",
    },
    "batman_robin": {
        "speakers": ["Batman", "Robin"],
        "style": "Batman is ultra-serious and intense. Robin is confused, reactive, and keeps asking obvious questions.",
    },
    "tony_peter": {
        "speakers": ["Stewie", "Peter"],
        "style": "Stewie is witty, fast, smug, and does most of the explaining. Peter is eager, nerdy, reactive, and easily impressed.",
    },
    "walter_jesse": {
        "speakers": ["Walter", "Jesse"],
        "style": "Walter is intense and over-explanatory. Jesse is overwhelmed and keeps reacting to how insane the paper sounds.",
    },
}


def extract_paper_content(data: Dict[str, Any]) -> Dict[str, str]:
    title = (
        data.get("title")
        or data.get("paper_title")
        or data.get("metadata", {}).get("title")
        or "Untitled Research Paper"
    )

    abstract = (
        data.get("abstract")
        or data.get("summary")
        or data.get("metadata", {}).get("abstract")
        or ""
    )

    chunks: List[str] = []

    if isinstance(data.get("sections"), list):
        for section in data["sections"]:
            heading = section.get("heading") or section.get("title") or ""
            text = section.get("text") or ""
            chunk = "\n".join(part for part in [heading, text] if part).strip()
            if chunk:
                chunks.append(chunk)
    elif isinstance(data.get("pages"), list):
        for page in data["pages"]:
            text = page.get("text") or ""
            if text:
                chunks.append(text)
    elif isinstance(data.get("text"), str):
        chunks.append(data["text"])
    else:
        chunks.append(json.dumps(data, ensure_ascii=False))

    body = "\n\n".join(chunks)
    return {
        "title": title,
        "abstract": abstract,
        "body": body[:18000],
    }


def build_prompt(paper: Dict[str, str], character_id: str, max_lines: int) -> str:
    preset = CHARACTER_PRESETS[character_id]
    speaker_a, speaker_b = preset["speakers"]

    return f"""You are turning a research paper into a funny, high-level, easy-to-understand dialogue.

Write a short "brainrot" script where two preset characters talk to each other and explain the paper at a high level.

Characters:
- {speaker_a}
- {speaker_b}

Character behavior:
{preset['style']}

Rules:
- Explain the paper at a high level only
- Focus on the main problem, the main idea, and why it matters
- Keep it accurate, but simplify jargon
- Make it funny, internet-style, exaggerated, and entertaining
- Keep the dialogue clean and usable for a public-facing short video
- Use short spoken lines
- Maximum {max_lines} total lines of dialogue
- Start with a strong hook
- End with a punchy final line
- Do not mention camera directions, scene directions, or video editing instructions
- Do not output JSON
- Output only the dialogue in this exact format:
{speaker_a}: ...
{speaker_b}: ...
{speaker_a}: ...

Paper title:
{paper['title']}

Abstract:
{paper['abstract']}

Paper text:
{paper['body']}"""


def generate_script(
    parsed_pdf: Dict[str, Any],
    character_id: str = "stewie_brian",
    model: str = "gpt-4o-mini",
    max_lines: int = 14,
) -> str:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

    if character_id not in CHARACTER_PRESETS:
        valid = ", ".join(CHARACTER_PRESETS.keys())
        raise ValueError(f"Invalid character '{character_id}'. Valid choices: {valid}")

    paper = extract_paper_content(parsed_pdf)
    prompt = build_prompt(paper, character_id, max_lines)

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a scriptwriter for short educational comedy videos. "
                    "Follow formatting exactly and output only the dialogue."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.9,
    )

    text = (response.choices[0].message.content or "").strip()
    if not text:
        raise RuntimeError("Model returned empty output.")

    return text
