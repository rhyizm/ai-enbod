#!/usr/bin/env ts-node

import { Assistant, ChatSession } from "../../src/index";
import dotenv from "dotenv";

// .env ファイルの読み込み
dotenv.config();

(async () => {
  try {
    const apikey = process.env.OPENAI_API_KEY;
    if (!apikey) {
      throw new Error("API Key is not set");
    }

    console.log("アシスタントを作成中…");
    const assistantA = await Assistant.create({
      assistantCreateParams: {
        name: "Assistant A",
        instructions: "あなたはアシスタントAです。ティラノサウルスの方が強いという立場で議論に参加してください。",
        model: "gpt-4o-mini",
        temperature: 0.85,
        top_p: 0.99
      },
    });

    const assistantB = await Assistant.create({
      assistantCreateParams: {
        name: "Assistant B",
        instructions: "あなたはアシスタントBです。タルボサウルスの方が強いという立場で議論に参加してください。",
        model: "gpt-4o-mini",
        temperature: 0.85,
        top_p: 0.99
      },
    });

    console.log(`Assistant A (${assistantA.id}) と Assistant B (${assistantB.id}) を作成しました。`);

    // ChatSession の作成
    const session = new ChatSession({assistants: [assistantA, assistantB]});
    session.topic = "ティラノサウルスとタルボサウルス、どっちが強いか議論して。";
    console.log("チャットセッションを開始します…");

    // セッションが完了するまでループ（エラー発生時は内部で中断）
    while (session.status !== "completed") {
      await session.startLoop({ limit: 4 });
      // 少し待機（3秒）
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`現在のセッションステータス: ${session.status}`);
    }

    console.log("チャットセッションが完了しました。");
    console.log("テスト完了後のセッションデータ:", session);

    // 作成したアシスタントの削除
    await Assistant.delete({ assistantId: assistantA.id });
    await Assistant.delete({ assistantId: assistantB.id });
    console.log("作成したアシスタントを削除しました。");

    // 終了チェック
    if (session.status !== "completed") {
      throw new Error("セッションが正常に完了しませんでした。");
    }

    console.log("テスト成功: セッションが正常に完了しました。");
  } catch (error) {
    console.error("テスト失敗:", error);
    process.exit(1);
  }
})();
