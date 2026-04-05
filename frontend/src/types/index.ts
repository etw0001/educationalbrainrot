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
  videoJobId: string | null;
  videoStatus: VideoJobStatus | null;
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

export interface VideoJobSubmitResult {
  job_id: string;
  status: string;
  segment_count: number;
}

export interface VideoSegmentStatus {
  segment_index: number;
  fal_status: string;
  duration_sec: number;
  text: string;
  video_url: string | null;
  error: string | null;
}

export interface VideoJobStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: {
    completed_segments: number;
    total_segments: number;
  };
  segments: VideoSegmentStatus[];
  final_video_url: string | null;
  error: string | null;
}

export interface CharacterOption {
  id: string;
  label: string;
  speakers: [string, string];
  description: string;
  emoji: string;
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
