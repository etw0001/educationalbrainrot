import type { ParsedPDF, GeneratedScript, VideoJobSubmitResult, VideoJobStatus } from "@/types";

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

export async function submitVideoJob(
  script: string,
  character: string = "stewie_brian",
): Promise<VideoJobSubmitResult> {
  const res = await fetch(`${API_BASE}/api/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script, character }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Video submission failed (${res.status})`);
  }

  return res.json();
}

export async function pollVideoStatus(jobId: string): Promise<VideoJobStatus> {
  const res = await fetch(`${API_BASE}/api/video-status/${jobId}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Video status check failed (${res.status})`);
  }

  return res.json();
}

export function getVideoResultUrl(jobId: string): string {
  return `${API_BASE}/api/video-result/${jobId}`;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
