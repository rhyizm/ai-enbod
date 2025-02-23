// src/chat-session.ts
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { Assistant } from "./index";
import { ChatSession as IChatSession, Message, sessionStatus, Role } from "./types/chat";

/**
 * ChatSession クラスは、複数の AI 参加者によるチャットセッションの進行・状態管理を担います。
 */
class ChatSession implements IChatSession {
  public uuid: string;
  public assistants: Assistant[] = [];
  public messages: Message[] = [];
  public topic: string = "";
  public threadId: string = "";
  public status: sessionStatus = "pending";
  public hash: string = "";
  public createdAt: number;
  public updatedAt: number;

  /**
   * コンストラクタ
   * @param session DBから取得したセッション情報
   */
  constructor(params: { assistants: Assistant[], options?: { topic?: string, threadId?: string } }) {
    this.uuid = uuidv4();
    this.assistants = [ ...params.assistants ];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.topic = params.options?.topic || "";
    this.threadId = params.options?.threadId || "";
  }

  /**
   * メッセージを追加する
   */
  addMessage(params: {
    role: Role,
    content: string,
    senderId: string,
    displayName?: string,
    profileImage?: string,
  }): void {
    this.messages.push({
      uuid: uuidv4(),
      role: params.role,
      content: params.content,
      senderId: params.senderId,
      displayName: params.displayName || "",
      profileImage: params.profileImage || "",
      timestamp: Date.now(),
    });
  }

  /**
   * セッションを進行させる
   */
  public async run(params?: { assistantId?: string }): Promise<void> {
    this.status = "running";

    const assistantId = params?.assistantId || "";
    const assistantMessages = this.messages.filter((message) => message.role === "assistant");
    const lastAssistantMessage = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
    const lastAssistantId = lastAssistantMessage ? lastAssistantMessage.senderId : "";

    let nextAssistant: Assistant | undefined;
    if (assistantId) {
      nextAssistant = this.assistants.find((assistant) => assistant.id === assistantId);
    } else {
      for (const assistant of this.assistants) {
        if (assistant.id !== lastAssistantId) {
          nextAssistant = assistant;
          break;
        }
      }
    }

    if (!nextAssistant) {
      throw new Error("No eligible assistant found for next response.");
    }

    const lastMessage = this.messages[this.messages.length - 1] || null;
    let response;
    response = await nextAssistant.chat({
      userMessage: lastMessage ? lastMessage.content : this.topic,
      threadId: this.threadId || undefined,
    });

    // 新たに返されたスレッドIDがあれば更新
    this.threadId = response.thread?.id || this.threadId;

    const assistantName = await nextAssistant.getName();

    const newMessage: Message = {
      uuid: uuidv4(),
      role: "assistant",
      content: response.assistant.message.text,
      senderId: nextAssistant.id,
      displayName: assistantName,
      timestamp: Date.now(),
    };

    this.messages.push(newMessage);
    this.hash = crypto.createHash("sha256").update(JSON.stringify(this.messages)).digest("hex");
    this.status = "completed";
  }

  /**
   * セッションを開始し、AI 同士の対話を進行する
   */
  public async startLoop(options: {
    limit?: number;
  }): Promise<void> {
    if (this.status === "running") {
      throw new Error("Session is already running");
    }

    const limit = options.limit || 4;

    this.status = "running";

    await this.runConversationLoop(limit);
  }

  /**
   * AI 同士の対話ループを実行する
   */
  private async runConversationLoop(limit: number): Promise<void> {
    try {
      let counter = 0;
      while (counter < limit) {
        counter++;

        // 直近のアシスタント発言を取得
        const messages = this.messages;
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const lastAssistantId = lastMessage ? lastMessage.senderId : "";

        // 最後に発言していない参加者（かつ AI であるもの）を次の発言者として選定
        let nextAssistant: Assistant | undefined;
        for (const assistant of this.assistants) {
          if (assistant.id !== lastAssistantId) {
            nextAssistant = assistant;
            break;
          }
        }
        if (!nextAssistant) {
          console.warn("No eligible assistant found for next response.");
          break;
        }

        // 前回のメッセージが存在する場合、その内容を元に次の発言を生成
        let response;
        response = await nextAssistant.chat({
          userMessage: lastMessage ? lastMessage.content : this.topic,
          threadId: this.threadId || undefined,
        });

        // 新たに返されたスレッドIDがあれば更新
        this.threadId = response.thread?.id || this.threadId;

        const assistantName = await nextAssistant.getName();

        const newMessage: Message = {
          uuid: uuidv4(),
          role: "assistant",
          content: response.assistant.message.text,
          senderId: nextAssistant.id,
          displayName: assistantName,
          timestamp: Date.now(),
        };

        this.messages.push(newMessage);
        this.hash = crypto.createHash("sha256").update(JSON.stringify(this.messages)).digest("hex");
      }
      // 対話が上限に達した場合、セッションを終了状態にする
      this.status = "completed";
    } catch (error) {
      console.error("Error in conversation loop:", error);
      this.status = "error";
    }
  }
}

export default ChatSession;