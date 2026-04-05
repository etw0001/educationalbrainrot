import { useState, useRef, useCallback } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onUploadClick: () => void;
  disabled?: boolean;
  pdfName?: string | null;
}

export function ChatInput({ onSend, onUploadClick, disabled, pdfName }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto px-4 pb-6 pt-2">
        {pdfName && (
          <div className="flex items-center gap-2 mb-2.5 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>
              Chatting about: <span className="text-foreground font-medium">{pdfName}</span>
            </span>
          </div>
        )}
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2.5",
            "shadow-sm transition-all duration-200",
            "focus-within:shadow-md focus-within:border-foreground/20"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={onUploadClick}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Ask about your PDF..."
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none border-0 bg-transparent text-[13.5px] leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 max-h-[200px] py-1"
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-xl"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
