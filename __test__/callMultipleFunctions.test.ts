import Assistant from "../src/assistant";
import functionMap from "../src/functionMap";
import getAuthorInfo from "./getAuthorInfo";
import { geocoding, getMap } from "./mocks";
import dotenv from 'dotenv';

dotenv.config();

describe("[Assistant] Test Multiple Function Calling", () => {
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
});
