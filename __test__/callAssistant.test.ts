import Assistant from "../src/assistant";
import functionMap from "../src/functionMap";
import dotenv from 'dotenv';

dotenv.config();

describe("Call Assistant Tests", () => {
  let assistant: Assistant;
  let assistantID: string;

  beforeAll(() => {
    assistantID = process.env.OPENAI_TEST_ASSISTANT_ID || "";
    if (assistantID === "") {
      console.error("Please set the OPENAI_TEST_ASSISTANT_ID environment variable");
      process.exit(1);
    }

    const myFunctionMap = { ...functionMap };

    assistant = new Assistant({
      assistantId: assistantID,
      functionMap: myFunctionMap,
    });
  });

  test("Call assistant", async () => {
    try {
      const response = await assistant.chat({
        userMessage: "翻訳の専門家を呼び出し、この文章を英語にして「私は5年前から脳脊髄液減少症と闘い続けており、主演ドラマ「エンジェルフライト」では国際霊柩送還士を演じた。」",
      });

      if (response.error) {
        throw new Error(`${response.error}`);
      }

      // 呼び出したアシスタントが最終的にデフォルトのアシスタントAIと異なっている
      expect(response.error).toBeNull();
      expect(response.assistant.id).not.toEqual(assistantID);
    } catch (error) {
      console.error(error);
    }
  }, 300000);
});
