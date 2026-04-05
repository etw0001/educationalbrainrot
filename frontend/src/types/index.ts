export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  pdfName: string | null;
  pdfData: ParsedPDF | null;
  script: string | null;
  createdAt: Date;
}

export interface PDFFile {
  file: File;
  name: string;
  size: number;
}

export interface GeneratedScript {
  script: string;
  character: string;
}

export interface ParsedPDF {
  metadata: {
    title: string;
    author: string;
    subject: string;
    creator: string;
    page_count: number;
  };
  pages: {
    page: number;
    text: string;
    tables: { rows: string[][] }[];
    figures: {
      image_index: number;
      width: number;
      height: number;
      format: string;
      data_base64?: string;
    }[];
  }[];
}
