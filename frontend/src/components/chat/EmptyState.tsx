import { FileUp, Zap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface EmptyStateProps {
  onUploadClick: () => void;
}

const features = [
  {
    icon: FileUp,
    title: "Upload",
    description: "Drop any research paper or PDF document",
  },
  {
    icon: Zap,
    title: "Generate",
    description: "AI creates a fun dialogue script instantly",
  },
  {
    icon: BookOpen,
    title: "Learn",
    description: "Understand complex papers the entertaining way",
  },
];

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="max-w-2xl text-center"
      >
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Educational Brainrot
        </h1>
        <div className="mb-10 w-full max-w-full overflow-x-auto">
          <p className="whitespace-nowrap text-base leading-relaxed text-muted-foreground">
            Turn research papers into entertaining dialogues powered by AI.
          </p>
        </div>

        <Button
          onClick={onUploadClick}
          size="lg"
          className="h-12 rounded-full px-8 text-sm font-medium shadow-sm transition-shadow hover:shadow-md"
        >
          Upload a PDF to get started
        </Button>

        <div className="grid grid-cols-3 gap-4 mt-14">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
              className="p-4 rounded-2xl border border-border bg-card text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center mb-3">
                <f.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
