import { useState, useCallback } from "react";
import type { Message, Conversation } from "@/types";

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
      createdAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    return newConversation.id;
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
          if (c.messages.length === 0) {
            updated.title = content.trim().slice(0, 40) + (content.trim().length > 40 ? "..." : "");
          }
          return updated;
        })
      );

      setIsLoading(true);

      // Simulate an AI response — will be replaced by real backend call
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1500));

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content:
          "This is a placeholder response. Once the backend is connected, I'll analyze your PDF and provide real answers based on the content.",
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
    [activeConversationId]
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
    setActiveConversationId,
    createConversation,
    sendMessage,
    deleteConversation,
  };
}
