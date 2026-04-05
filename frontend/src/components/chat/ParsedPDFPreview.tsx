import type { ParsedPDF } from "@/types";
import { cn } from "@/lib/utils";

const TEXT_CAP = 4000;

function imageMimeFromFormat(format: string): string {
  const f = format.toLowerCase();
  if (f === "jpg" || f === "jpeg") return "image/jpeg";
  if (f === "png") return "image/png";
  if (f === "gif") return "image/gif";
  if (f === "webp") return "image/webp";
  if (f === "bmp") return "image/bmp";
  return `image/${f}`;
}

interface ParsedPDFPreviewProps {
  data: ParsedPDF;
  className?: string;
}

export function ParsedPDFPreview({ data, className }: ParsedPDFPreviewProps) {
  const { metadata, pages } = data;
  const pageList = Array.isArray(pages) ? pages : [];

  return (
    <div
      className={cn(
        "border-b border-border bg-muted/20 shrink-0 max-h-[min(40vh,28rem)] overflow-y-auto scrollbar-thin",
        className
      )}
    >
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 text-xs">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Parsed PDF
        </p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-foreground">
          <dt className="text-muted-foreground">Title</dt>
          <dd className="font-medium break-all">{metadata?.title || "—"}</dd>
          <dt className="text-muted-foreground">Author</dt>
          <dd className="break-all">{metadata?.author || "—"}</dd>
          <dt className="text-muted-foreground">Pages</dt>
          <dd>{metadata?.page_count ?? pageList.length}</dd>
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="break-all">{metadata?.subject || "—"}</dd>
        </dl>

        <div className="space-y-3 pt-1">
          {pageList.map((p) => {
            const raw = typeof p.text === "string" ? p.text : "";
            const text =
              raw.length > TEXT_CAP ? `${raw.slice(0, TEXT_CAP)}… [truncated]` : raw;
            const tables = Array.isArray(p.tables) ? p.tables : [];
            const figures = Array.isArray(p.figures) ? p.figures : [];
            return (
              <div
                key={p.page}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <p className="text-[13px] font-semibold tracking-tight">Page {p.page}</p>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {text || "(no text)"}
                </pre>

                {tables.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-foreground">
                      Tables ({tables.length})
                    </p>
                    {tables.map((t, i) => (
                      <div
                        key={i}
                        className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-2"
                      >
                        <table className="border-collapse text-[11px]">
                          <tbody>
                            {(Array.isArray(t.rows) ? t.rows : []).map((row, ri) => (
                              <tr key={ri}>
                                {(Array.isArray(row) ? row : []).map((cell, ci) => (
                                  <td
                                    key={ci}
                                    className="border border-border/40 px-2.5 py-1 align-top"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                {figures.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-foreground">
                      Figures ({figures.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {figures.map((fig, i) => (
                        <div key={i}>
                          {fig.data_base64 ? (
                            <img
                              src={`data:${imageMimeFromFormat(fig.format ?? "png")};base64,${fig.data_base64}`}
                              alt={`Page ${p.page} figure ${fig.image_index}`}
                              className="max-h-32 max-w-full rounded-lg border border-border object-contain bg-card"
                            />
                          ) : (
                            <span className="text-muted-foreground">
                              Fig. {fig.image_index} ({fig.width}×{fig.height}, {fig.format}) — no
                              image data
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
