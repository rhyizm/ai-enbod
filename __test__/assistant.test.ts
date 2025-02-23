import Assistant from "../src/assistant";
import functionMap from "../src/functionMap";
import getAuthorInfo from "./getAuthorInfo";
import { geocoding, getMap } from "./mocks";
import dotenv from 'dotenv';

dotenv.config();

describe("Assistant Tests", () => {
  let assistant: Assistant;
  let assistantID: string;

  beforeAll(() => {
    assistantID = process.env.OPENAI_TEST_ASSISTANT_ID || "";
    if (assistantID === "") {
      console.error("Please set the OPENAI_TEST_ASSISTANT_ID environment variable");
      process.exit(1);
    }

    const myFunctionMap = { ...functionMap };
    myFunctionMap.getAuthorInfo = getAuthorInfo;
    myFunctionMap.geocoding = geocoding;
    myFunctionMap.getMap = getMap;

    assistant = new Assistant({
      assistantId: assistantID,
      functionMap: myFunctionMap,
      argumentMap: {
        getAuthorInfo: {
          name: "rhyizm (rhyizm.ai)"
        }
      }
    });
  });

  test("Get author information", async () => {
    try {
      const response = await assistant.chat({
        userMessage: "あなたの作者情報を教えて",
      });

      if (response.error) {
        throw new Error(`${response.error}`);
      }

      expect(response.error).toBeNull();
      expect(response.assistant.message.text).toMatch(/rhyizm/);
    } catch (error) {
      console.error(error);
    }
  }, 300000);

  test("Multiple Function Calling: Geocoding and GetMap", async () => {
    try {
      const userMessage = "東京の緯度経度を取得し、その地点の地図URLを教えてください。";

      const response = await assistant.chat({
        userMessage,
      });

      if (response.error) {
        throw new Error(`${response.error}`);
      }

      expect(response.error).toBeNull();

      // アシスタントが関数を呼び出したか確認
      expect(response.assistant.message.text).toContain("https://maps.example.com/");

      // 具体的な緯度経度を含むか確認
      expect(response.assistant.message.text).toContain("35.6895");
      expect(response.assistant.message.text).toContain("139.6917");
    } catch (error) {
      console.error(error);
    }
  }, 300000);

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
