import { Download, Film, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getVideoResultUrl } from "@/lib/api";
import type { VideoJobStatus } from "@/types";
import { motion } from "framer-motion";

interface VideoProgressProps {
  status: VideoJobStatus;
}

export function VideoProgress({ status }: VideoProgressProps) {
  const { progress, status: jobStatus, error, job_id, final_video_url } = status;
  const pct =
    progress.total_segments > 0
      ? Math.round((progress.completed_segments / progress.total_segments) * 100)
      : 0;

  const isTerminal = jobStatus === "completed" || jobStatus === "failed";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="shrink-0 border-t border-border bg-card"
    >
      <div className="max-w-2xl mx-auto px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px]">
            {jobStatus === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : jobStatus === "failed" ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <span className="font-medium">
              {jobStatus === "completed"
                ? "Video ready"
                : jobStatus === "failed"
                  ? "Video failed"
                  : "Generating video"}
            </span>
            <span className="text-muted-foreground">
              {progress.completed_segments}/{progress.total_segments} segments
            </span>
          </div>

          {jobStatus === "completed" && final_video_url && (
            <a
              href={getVideoResultUrl(job_id)}
              download={`brainrot_${job_id}.mp4`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download MP4
              </Button>
            </a>
          )}
        </div>

        {!isTerminal && (
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-foreground/80"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        )}

        {jobStatus === "completed" && final_video_url && (
          <video
            src={getVideoResultUrl(job_id)}
            controls
            className="w-full rounded-xl border border-border mt-1"
            preload="metadata"
          />
        )}

        {jobStatus === "failed" && error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
