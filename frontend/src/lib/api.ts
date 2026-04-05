import type { ParsedPDF, GeneratedScript } from "@/types";

const API_BASE = "http://localhost:5001";

export async function parsePDF(file: File): Promise<ParsedPDF> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/parse`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed (${res.status})`);
  }

  return res.json();
}

export async function generateScript(
  parsedPdf: ParsedPDF,
  character: string = "stewie_brian",
  maxLines: number = 14,
): Promise<GeneratedScript> {
  const res = await fetch(`${API_BASE}/api/generate-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parsed_pdf: parsedPdf,
      character,
      max_lines: maxLines,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Script generation failed (${res.status})`);
  }

  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
