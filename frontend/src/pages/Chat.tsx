import { useState, useCallback, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/chat/Sidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { PDFUpload } from "@/components/chat/PDFUpload";
import { VideoProgress } from "@/components/chat/VideoProgress";
import { EmptyState } from "@/components/chat/EmptyState";
import { useChat } from "@/hooks/use-chat";
import { parsePDF, generateScript, submitVideoJob, pollVideoStatus } from "@/lib/api";
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
    setScript,
    setVideoJob,
    updateVideoStatus,
    sendMessage,
    deleteConversation,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState("stewie_brian");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for video job completion
  useEffect(() => {
    if (!activeConversation?.videoJobId) return;
    const vs = activeConversation.videoStatus;
    if (!vs || vs.status === "completed" || vs.status === "failed") return;

    const jobId = activeConversation.videoJobId;
    const convId = activeConversation.id;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const status = await pollVideoStatus(jobId);
        updateVideoStatus(convId, status);

        if (status.status === "completed" || status.status === "failed") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (status.status === "completed") {
            toast.success("Video ready!");
          } else {
            toast.error(status.error || "Video generation failed");
          }
        }
      } catch {
        // Transient poll error, keep retrying
      }
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeConversation?.videoJobId, activeConversation?.videoStatus?.status, activeConversation?.id, updateVideoStatus]);

  const handleUpload = useCallback(
    async (file: File) => {
      const character = selectedCharacter;
      let conversationId = "";
      flushSync(() => {
        conversationId = createConversation(file.name);
      });
      setIsLoading(true);

      const loadingToast = toast.loading(`Parsing ${file.name}...`);

      try {
        const result = await parsePDF(file);
        setPDFData(conversationId, result);
        const n = result.metadata.page_count;
        const pageLabel = n === 1 ? "1 page" : `${n} pages`;
        toast.success(`Parsed ${file.name} - ${pageLabel}`, {
          id: loadingToast,
        });

        const scriptToast = toast.loading("Generating script...");
        try {
          const { script } = await generateScript(result, character);
          setScript(conversationId, script);
          toast.success("Script generated!", { id: scriptToast });

          const videoToast = toast.loading("Submitting video job...");
          try {
            const { job_id, segment_count } = await submitVideoJob(script, character);
            setVideoJob(conversationId, job_id, segment_count);
            toast.success(`Video queued - ${segment_count} segments`, { id: videoToast });
          } catch (videoErr) {
            const vmsg = videoErr instanceof Error ? videoErr.message : "Video submission failed";
            toast.error(vmsg, { id: videoToast });
          }
        } catch (scriptErr) {
          const msg = scriptErr instanceof Error ? scriptErr.message : "Script generation failed";
          toast.error(msg, { id: scriptToast });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse PDF";
        toast.error(message, { id: loadingToast });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCharacter, createConversation, setIsLoading, setPDFData, setScript, setVideoJob]
  );

  const openUploadModal = useCallback(() => {
    setUploadModalOpen(true);
  }, []);

  const handleNewChat = useCallback(() => {
    openUploadModal();
  }, [openUploadModal]);

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
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="truncate text-base font-semibold leading-none tracking-tight">
            {activeConversation?.title ?? "Educational Brainrot"}
          </h1>
        </header>

        {activeConversation ? (
          <>
            <MessageList
              messages={activeConversation.messages}
              isLoading={isLoading}
            />
            {activeConversation.videoStatus && (
              <VideoProgress status={activeConversation.videoStatus} />
            )}
            <ChatInput
              onSend={sendMessage}
              onUploadClick={openUploadModal}
              disabled={isLoading}
              pdfName={activeConversation.pdfName}
            />
          </>
        ) : (
          <EmptyState
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
            onUploadClick={openUploadModal}
          />
        )}
      </main>

      <PDFUpload
        onUpload={handleUpload}
        isVisible={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  );
}
