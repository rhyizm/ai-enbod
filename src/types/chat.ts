import Assistant from "../assistant";

// types/chat.ts
export type Role = "system" | "assistant" | "user";

export type sessionStatus = "pending" | "running" | "completed" | "error";

/**
 * メッセージの型
 */
export interface Message {
  uuid: string;
  role: Role;
  content: string;
  senderId: string;
  displayName: string;
  profileImage?: string;
  timestamp: number;
}

/**
 * AI・ユーザーの識別情報
 */
export interface Participant {
  uuid: string;
  persona: {
    name: string;
    description?: string;
  };
  isAI: boolean;
}

/**
 * チャットのセッション情報
 */
export interface ChatSession {
  uuid: string;
  assistants: Assistant[];
  messages: Message[];
  topic: string;
  threadId?: string;
  status: sessionStatus;
  hash: string;
  createdAt: number;
  updatedAt: number;
}
