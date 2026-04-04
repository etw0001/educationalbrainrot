import { useState, useRef, useCallback } from "react";
import { Send, Paperclip } from "lucide-react";
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
    <div className="border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto p-4">
        {pdfName && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>Chatting about: <strong className="text-foreground">{pdfName}</strong></span>
          </div>
        )}
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-input bg-background p-2 transition-colors",
            "focus-within:ring-1 focus-within:ring-ring focus-within:border-ring"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
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
            className="flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-[200px]"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Upload a PDF and ask questions about its content
        </p>
      </div>
    </div>
  );
}
