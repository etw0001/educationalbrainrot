import { Plus, MessageSquare, Trash2, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        isOpen ? "w-[280px]" : "w-0 overflow-hidden border-r-0"
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-5">
        <h2 className="text-[13px] font-semibold leading-none tracking-tight text-sidebar-foreground">
          Conversations
        </h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-8 text-center leading-relaxed">
              Upload a PDF to start
            </p>
          )}
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] cursor-pointer transition-colors",
                conversation.id === activeConversationId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span className="truncate flex-1">{conversation.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
