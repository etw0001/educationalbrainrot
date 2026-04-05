import { useState, useCallback } from "react";
import type { Message, Conversation, ParsedPDF } from "@/types";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  const createConversation = useCallback((pdfName: string | null = null) => {
    const newConversation: Conversation = {
      id: generateId(),
      title: pdfName ? `Chat: ${pdfName}` : "New Chat",
      messages: [],
      pdfName,
      pdfData: null,
      script: null,
      createdAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    return newConversation.id;
  }, []);

  const setPDFData = useCallback((conversationId: string, data: ParsedPDF) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;

        const meta = data.metadata;
        const totalPages = meta.page_count;
        const totalTables = data.pages.reduce((sum, p) => sum + p.tables.length, 0);
        const totalFigures = data.pages.reduce((sum, p) => sum + p.figures.length, 0);

        const systemMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: `PDF parsed successfully!\n\n**${meta.title || c.pdfName || "Untitled"}**${meta.author ? `\nAuthor: ${meta.author}` : ""}\n\n- ${totalPages} page${totalPages !== 1 ? "s" : ""}\n- ${totalTables} table${totalTables !== 1 ? "s" : ""}\n- ${totalFigures} figure${totalFigures !== 1 ? "s" : ""}\n\nAsk me anything about this document.`,
          timestamp: new Date(),
        };

        return { ...c, pdfData: data, messages: [...c.messages, systemMessage] };
      })
    );
  }, []);

  const setScript = useCallback((conversationId: string, script: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;

        const scriptMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: `**Generated Script:**\n\n${script}`,
          timestamp: new Date(),
        };

        return { ...c, script, messages: [...c.messages, scriptMessage] };
      })
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId || !content.trim()) return;

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          const updated = { ...c, messages: [...c.messages, userMessage] };
          if (c.messages.length <= 1) {
            updated.title = content.trim().slice(0, 40) + (content.trim().length > 40 ? "..." : "");
          }
          return updated;
        })
      );

      setIsLoading(true);

      // Placeholder — will be replaced when an LLM endpoint is added
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

      const conv = conversations.find((c) => c.id === activeConversationId);
      const hasPdf = !!conv?.pdfData;

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: hasPdf
          ? "The PDF has been parsed and I have the full text, tables, and figures. Once an LLM endpoint is connected to the backend, I'll give you real answers based on the document content."
          : "No PDF has been uploaded for this conversation yet. Upload a PDF first so I can analyze it.",
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
      );

      setIsLoading(false);
    },
    [activeConversationId, conversations]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId]
  );

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    setIsLoading,
    setActiveConversationId,
    createConversation,
    setPDFData,
    setScript,
    sendMessage,
    deleteConversation,
  };
}
