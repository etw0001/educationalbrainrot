export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  pdfName: string | null;
  createdAt: Date;
}

export interface PDFFile {
  file: File;
  name: string;
  size: number;
}
