import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CHARACTERS } from "@/lib/characters";

interface EmptyStateProps {
  selectedCharacter: string;
  onSelectCharacter: (id: string) => void;
  onUploadClick: () => void;
}

export function EmptyState({ selectedCharacter, onSelectCharacter, onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="max-w-2xl w-full text-center"
      >
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Educational Brainrot
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground mb-10">
          Turn research papers into entertaining dialogues powered by AI.
        </p>

        <p className="text-sm font-medium text-muted-foreground mb-3">
          Choose your characters
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8 max-w-lg mx-auto">
          {CHARACTERS.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + i * 0.04 }}
              onClick={() => onSelectCharacter(c.id)}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-150",
                selectedCharacter === c.id
                  ? "border-foreground/30 bg-muted/60 ring-1 ring-foreground/10"
                  : "border-border hover:border-foreground/15 hover:bg-muted/30"
              )}
            >
              <span className="text-xl leading-none shrink-0">{c.emoji}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight truncate">{c.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                  {c.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          onClick={onUploadClick}
          size="lg"
          className="h-12 rounded-full px-8 text-sm font-medium shadow-sm transition-shadow hover:shadow-md"
        >
          Upload a PDF to get started
        </Button>
      </motion.div>
    </div>
  );
}
