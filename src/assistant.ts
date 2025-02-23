import OpenAI from "openai";
import Debug from "debug";
import { ArgumentMap, FunctionMap } from "./functionMap";
import Thread from "./thread";

const debugAssistant = Debug('@rhyizm/ai-enbod:Assistant');

export interface IAssistantChatResponseMessage {
  type: "text";
  text: string;
}

export interface IAssistantChatResponse {
  thread: OpenAI.Beta.Threads.Thread | null;
  run: OpenAI.Beta.Threads.Runs.Run | null;
  assistant: {
    id: string;
    message: IAssistantChatResponseMessage
  };
  error: string | null;
}

class Assistant {
  private openai: OpenAI | undefined;
  private assistantId: string;
  private assistantName: string = "";
  private functionMap: FunctionMap;
  private argumentMap: ArgumentMap = {};

  constructor (params: {
    assistantId: string,
    assistantName?: string,
    functionMap?: FunctionMap;
    argumentMap?: ArgumentMap;
    apiKey?: string;
  }) {
    if (params.apiKey) {
      this.openai = new OpenAI({ apiKey: params.apiKey});
    } else {
      this.openai = new OpenAI();
    }

    this.openai.beta.assistants.retrieve(params.assistantId)
      .then(assistant => {
        if (!assistant) throw new Error("Assistant ID is invalid");
      })

    this.assistantId = params.assistantId;
    this.assistantName = params.assistantName || "";
    this.functionMap = params.functionMap || {};
    this.argumentMap = params.argumentMap || {};

    debugAssistant(`Assistant initialized: ${this.assistantId}`);
  }

  get id(): string {
    return this.assistantId;
  }

  public async getName(): Promise<string> {
    if (this.assistantName) {
      return this.assistantName;
    }

    if (!this.openai) {
      throw new Error("OpenAI is not initialized");
    }
    const retreved = await this.openai.beta.assistants.retrieve(this.assistantId);
    if (!retreved) {
      throw new Error("Assistant ID is invalid");
    }

    this.assistantName = retreved.name || "";
    return retreved.name || "";
  }

  static async create (params: {
    assistantCreateParams: OpenAI.Beta.Assistants.AssistantCreateParams,
    functionMap?: FunctionMap,
    argumentMap?: ArgumentMap,
    apiKey?: string
  }): Promise<Assistant> {
    const apiKey = process.env.OPENAI_API_KEY || params.apiKey;
    if (!apiKey) {
      throw new Error("OpenAI API Key is not set");
    }

    const openai = new OpenAI({ apiKey: apiKey });
    const newAssistant = await openai.beta.assistants.create(params.assistantCreateParams);

    debugAssistant(`Assistant Created: ${newAssistant}`);

    return new Assistant({
      assistantId: newAssistant.id,
      assistantName: params.assistantCreateParams.name || "",
      functionMap: params.functionMap || {},
      argumentMap: params.argumentMap || {},
      apiKey: apiKey
    });
  }

  static async delete (params: {assistantId: string, apiKey?: string}): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY || params.apiKey;
    const openai = new OpenAI({ apiKey: apiKey });
    await openai.beta.assistants.del(params.assistantId);
    debugAssistant(`Assistant Deleted: ${params.assistantId}`);
  }
  
  async chat (params: {
    userMessage: string,
    threadId?: string,
  }): Promise<IAssistantChatResponse> {
    const response: IAssistantChatResponse = {
      thread: null,
      run: null,
      assistant: {
        id: this.assistantId,
        message: {
          type: "text",
          text: ""
        }
      },
      error: null
    };

    try {      
      const thread = new Thread({ id: params.threadId || "" });
      await thread.initialize();
  
      // Call Assistantで呼ばれる場合にはメッセージが空の場合がある。
      if (params.userMessage) {
        await thread.createMessage({ message: params.userMessage });
      }

      const run = await thread.run({ assistantId: this.assistantId, functionMap: this.functionMap, argumentMap: this.argumentMap });
  
      // Threadのレスポンスに不明なbodyが含まれているため、一旦JSON化してから取り出す
      // 現在ベータなので、恐らく将来のバージョンでの実装が入っていると思われる
      // 一応、データの取り出し方を残しておく
      // const threadMessageBody: IOpenAIThreadMessageBody = JSON.parse(JSON.stringify(threadMessagesPage["body"]));
      if (run.status === "completed") {
        const threadMessagesPage = await thread.messages();
        const threadMessageData = threadMessagesPage.data;
        const threadMessageContent = JSON.parse(JSON.stringify(threadMessageData[0].content[0]));
        const assistantMessageText = threadMessageContent.text.value;

        response.assistant.id = run.assistant_id;
        response.assistant.message.text = assistantMessageText;
        response.thread = await thread.retrieve();
        response.run = run;
      } else {
        throw new Error(run.last_error?.message);
      }
    } catch (error: unknown) {
      response.error = (error as Error).message;
    }

    return response;
  }
}

export default Assistant;