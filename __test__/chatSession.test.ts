// chatSession.test.ts
import crypto from "crypto";
import { Assistant, ChatSession } from "../src/index";
import dotenv from "dotenv";

dotenv.config();

// モック用の Assistant を作成
const createMockAssistant = (
  id: string,
  responseText: string,
  getNameReturn: string,
  shouldThrow: boolean = false
): Assistant => {
  return {
    id,
    chat: jest.fn().mockImplementation(async (params: { userMessage: string; threadId?: string }) => {
      if (shouldThrow) {
        throw new Error("Chat error");
      }
      return {
        thread: { id: "thread1" },
        run: { assistant_id: id, last_error: null, status: "completed" },
        assistant: {
          id,
          message: { type: "text", text: responseText }
        },
        error: null
      };
    }),
    getName: jest.fn().mockResolvedValue(getNameReturn)
  } as unknown as Assistant;
};

describe("ChatSession", () => {
  let assistantA: Assistant;
  let assistantB: Assistant;

  beforeEach(() => {
    // 各テスト毎に新しいモックを作成
    assistantA = createMockAssistant("id-assistant-a", "response from assistantA", "Assistant A");
    assistantB = createMockAssistant("id-assistant-b", "response from assistantB", "Assistant B");
  });

  test("正常に対話ループが実行され、メッセージや状態が更新される", async () => {
    const session = new ChatSession({assistants: [assistantA, assistantB]});
    const limit = 4;
    await session.start({ limit });

    // セッションが終了状態になっていること
    expect(session.status).toBe("completed");
    // 対話回数（メッセージ数）が上限に達していること
    expect(session.messages.length).toBe(limit);

    // アシスタントの発言が交互に行われていることを確認
    expect(session.messages[0].senderId).toBe("id-assistant-a");
    expect(session.messages[1].senderId).toBe("id-assistant-b");
    expect(session.messages[2].senderId).toBe("id-assistant-a");
    expect(session.messages[3].senderId).toBe("id-assistant-b");

    // ハッシュが正しく計算されていることを確認
    const expectedHash = crypto.createHash("sha256").update(JSON.stringify(session.messages)).digest("hex");
    expect(session.hash).toBe(expectedHash);

    // チャット中に threadId が更新されている（モックでは "thread1" を返す）
    expect(session.threadId).toBe("thread1");
  });

  test("すでに running 状態の場合、start() がエラーをスローする", async () => {
    const session = new ChatSession({assistants: [assistantA, assistantB]});
    // セッションの状態を強制的に running にする
    session.status = "running";

    await expect(session.start({ limit: 2 })).rejects.toThrow("Session is already running");
  });

  test("アシスタントのチャット処理でエラーが発生した場合、対話ループが中断される", async () => {
    // assistantA は正常、assistantError は chat() 呼び出しでエラーをスローする
    const assistantError = createMockAssistant("assistant-error", "", "Error Assistant", true);

    // モックのアシスタント配列は、assistantA と assistantError の順にする
    const session = new ChatSession({assistants: [assistantA, assistantError]});
    // 1回目は assistantA、2回目は assistantError となるため、2回目でエラーとなるはず
    await session.start({ limit: 4 });

    // エラー発生時は対話ループ内で break され、セッションは error 状態となる
    expect(session.status).toBe("error");
    // 2回目の呼び出しでエラーとなったため、メッセージ数は 1 となる
    expect(session.messages.length).toBe(1);
  });

  
});
