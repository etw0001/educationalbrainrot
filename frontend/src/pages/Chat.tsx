import { useState, useCallback } from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/chat/Sidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { PDFUpload } from "@/components/chat/PDFUpload";
import { EmptyState } from "@/components/chat/EmptyState";
import { useChat } from "@/hooks/use-chat";
import { toast } from "sonner";

export default function Chat() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    setActiveConversationId,
    createConversation,
    sendMessage,
    deleteConversation,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleUpload = useCallback(
    (file: File) => {
      setUploadedFile(file);
      const conversationId = createConversation(file.name);
      setActiveConversationId(conversationId);
      toast.success(`Uploaded ${file.name}`);
    },
    [createConversation, setActiveConversationId]
  );

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  const handleNewChat = useCallback(() => {
    setUploadModalOpen(true);
  }, []);

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={handleNewChat}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-sm font-semibold truncate">
            {activeConversation?.title ?? "Educational Brainrot"}
          </h1>
        </header>

        {activeConversation ? (
          <>
            <MessageList
              messages={activeConversation.messages}
              isLoading={isLoading}
            />
            <ChatInput
              onSend={sendMessage}
              onUploadClick={() => setUploadModalOpen(true)}
              disabled={isLoading}
              pdfName={activeConversation.pdfName}
            />
          </>
        ) : (
          <EmptyState onUploadClick={() => setUploadModalOpen(true)} />
        )}
      </main>

      <PDFUpload
        onUpload={handleUpload}
        uploadedFile={uploadedFile}
        onRemove={handleRemoveFile}
        isVisible={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  );
}
