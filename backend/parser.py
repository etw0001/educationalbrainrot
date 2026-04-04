"""
PDF parser — no LLM.
Extracts all text, tables, and figures into structured JSON.
Uses PyMuPDF for text/images and pdfplumber for tables.
"""

import sys
import json
import base64
import csv
import os
import fitz  # pymupdf
import pdfplumber


def get_metadata(pdf_path: str) -> dict:
    doc = fitz.open(pdf_path)
    meta = doc.metadata or {}
    page_count = doc.page_count
    doc.close()
    return {
        "title": meta.get("title", ""),
        "author": meta.get("author", ""),
        "subject": meta.get("subject", ""),
        "creator": meta.get("creator", ""),
        "page_count": page_count,
    }


def extract_tables(pdf_path: str, tables_dir: str | None = None) -> dict[int, list]:
    """Use pdfplumber to extract tables, keyed by 1-based page number."""
    tables_by_page = {}
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            raw_tables = page.extract_tables()
            if not raw_tables:
                continue
            cleaned = []
            for t_index, table in enumerate(raw_tables):
                rows = [
                    [cell if cell is not None else "" for cell in row]
                    for row in table
                ]
                entry = {"rows": rows}

                if tables_dir:
                    os.makedirs(tables_dir, exist_ok=True)
                    filename = f"page{i}_table{t_index}.csv"
                    filepath = os.path.join(tables_dir, filename)
                    with open(filepath, "w", newline="", encoding="utf-8") as f:
                        writer = csv.writer(f)
                        writer.writerows(rows)
                    entry["saved_path"] = filepath

                cleaned.append(entry)
            tables_by_page[i] = cleaned
    return tables_by_page


def extract_pages(pdf_path: str, figures_dir: str | None, tables_by_page: dict[int, list]) -> list[dict]:
    doc = fitz.open(pdf_path)
    pages = []

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")

        figures = []
        for img_index, img_info in enumerate(page.get_images(full=True)):
            xref = img_info[0]
            base_image = doc.extract_image(xref)
            img_bytes = base_image["image"]
            ext = base_image["ext"]
            width = base_image["width"]
            height = base_image["height"]

            fig_entry = {
                "image_index": img_index,
                "width": width,
                "height": height,
                "format": ext,
            }

            if figures_dir:
                os.makedirs(figures_dir, exist_ok=True)
                filename = f"page{page_num}_fig{img_index}.{ext}"
                filepath = os.path.join(figures_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(img_bytes)
                fig_entry["saved_path"] = filepath
            else:
                fig_entry["data_base64"] = base64.standard_b64encode(img_bytes).decode()

            figures.append(fig_entry)

        pages.append({
            "page": page_num,
            "text": text,
            "tables": tables_by_page.get(page_num, []),
            "figures": figures,
        })

    doc.close()
    return pages


def parse_pdf(pdf_path: str, figures_dir: str | None = None, tables_dir: str | None = None) -> dict:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    print("Extracting metadata...", file=sys.stderr)
    metadata = get_metadata(pdf_path)

    print("Extracting tables...", file=sys.stderr)
    tables_by_page = extract_tables(pdf_path, tables_dir=tables_dir)

    print("Extracting pages (text + figures)...", file=sys.stderr)
    pages = extract_pages(pdf_path, figures_dir, tables_by_page)

    total_tables = sum(len(t) for t in tables_by_page.values())
    total_figures = sum(len(p["figures"]) for p in pages)
    print(
        f"Done: {metadata['page_count']} pages, {total_tables} tables, {total_figures} figures.",
        file=sys.stderr,
    )

    return {
        "metadata": metadata,
        "pages": pages,
    }
