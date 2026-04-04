import { FileUp, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold font-display mb-2">Educational Brainrot</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Upload a PDF and start asking questions. I'll parse the content and help you understand it.
        </p>

        <div className="space-y-3">
          <Button
            onClick={onUploadClick}
            size="lg"
            className="w-full rounded-xl gap-2"
          >
            <FileUp className="h-4 w-4" />
            Upload a PDF to get started
          </Button>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-left">
              <FileUp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">Upload</p>
                <p className="text-xs text-muted-foreground">Drop any PDF file</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-left">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">Ask</p>
                <p className="text-xs text-muted-foreground">Chat about the content</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
