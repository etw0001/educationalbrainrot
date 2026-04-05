import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PDFUploadProps {
  onUpload: (file: File) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function PDFUpload({ onUpload, isVisible, onClose }: PDFUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onUpload(file);
        window.setTimeout(() => onClose(), 0);
      }
    },
    [onUpload, onClose]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-card border border-border rounded-2xl p-7 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold tracking-tight">Upload PDF</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                "border border-dashed rounded-2xl py-12 px-6 text-center cursor-pointer transition-all duration-200",
                isDragActive
                  ? "border-foreground/30 bg-muted/60"
                  : "border-border hover:border-foreground/20 hover:bg-muted/30"
              )}
            >
              <input {...getInputProps()} />
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {isDragActive ? "Drop your PDF here" : "Drag & drop a PDF here"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                or click to browse files
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
