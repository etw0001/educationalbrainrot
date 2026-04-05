import { useState, useCallback } from "react";
import { flushSync } from "react-dom";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/chat/Sidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { PDFUpload } from "@/components/chat/PDFUpload";
import { ParsedPDFPreview } from "@/components/chat/ParsedPDFPreview";
import { EmptyState } from "@/components/chat/EmptyState";
import { useChat } from "@/hooks/use-chat";
import { parsePDF } from "@/lib/api";
import { toast } from "sonner";

export default function Chat() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    setIsLoading,
    setActiveConversationId,
    createConversation,
    setPDFData,
    sendMessage,
    deleteConversation,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadedFile(file);
      // Ensure the new conversation is committed before await parsePDF, otherwise
      // setPDFData's functional update can see prev=[] and wipe the list.
      let conversationId = "";
      flushSync(() => {
        conversationId = createConversation(file.name);
      });
      setIsLoading(true);

      const loadingToast = toast.loading(`Parsing ${file.name}...`);

      try {
        const result = await parsePDF(file);
        setPDFData(conversationId, result);
        toast.success(`Parsed ${file.name} — ${result.metadata.page_count} pages`, {
          id: loadingToast,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse PDF";
        toast.error(message, { id: loadingToast });
      } finally {
        setIsLoading(false);
      }
    },
    [createConversation, setIsLoading, setPDFData]
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
            {activeConversation.pdfData && (
              <ParsedPDFPreview data={activeConversation.pdfData} />
            )}
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
