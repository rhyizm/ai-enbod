import OpenAI from "openai";
import Debug from "debug";
import { ArgumentMap, FunctionMap, callAssistant } from "./functionMap";
import { IRequiresActionResponse } from "./types/requires-action-response";

const debugThread = Debug('@rhyizm/ai-enbod:Thread');

class Thread {
  protected openai = new OpenAI();
  public id: string;
  public userId: string;
  
  constructor(params: { id?: string; userId?: string;}) {
    this.id = params.id || "";
    this.userId = params.userId || "";

    debugThread(`Thread initialized\nThread ID: ${this.id}\nUser ID: ${this.userId}`);
  }

  async initialize() {
    // スレッド ID が空の場合はスレッドを作成する
    if (this.id === "") {
      const createdThread = await this.openai.beta.threads.create();
      this.id = createdThread.id;
    }
  }

  /**
   * Runのステータスを確認し完了するまで待機
   * @param threadId スレッド ID
   * @param runId Run ID
   * @returns
   */
  async checkRunStatus(params: { runId: string }): Promise<OpenAI.Beta.Threads.Runs.Run> {
    const run = await this.openai.beta.threads.runs.retrieve(this.id, params.runId);

    debugThread(`Run status: ${run.status}`);

    if (["queued", "in_progress", "cancelling"].includes(run.status)) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
      return await this.checkRunStatus({ runId: params.runId });
    }

    if (run.status === "failed") {
      throw new Error("Run failed: " + run.last_error?.message);
    }
  
    return run;
  }

  async handleRequiresAction(params: { run: OpenAI.Beta.Threads.Runs.Run, functionMap: FunctionMap, argumentMap: ArgumentMap}): Promise<IRequiresActionResponse> {
    const response: IRequiresActionResponse = {
      threadId: this.id,
      runId: params.run.id,
      action: "",
      function: "",
      arguments: "",
      result: ""
    }

    const run = params.run;
    const functionMap = params.functionMap || null;
    const argumentMap = params.argumentMap || {};

    if (run.required_action?.type === "submit_tool_outputs") {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

      for (const toolCall of toolCalls) {
        if (toolCall.type === "function") {
          const functionName = toolCall.function.name;

          if (functionName === "callAssistant") {
            // 他の Assistant の呼び出し
            await this.openai.beta.threads.runs.cancel(this.id, run.id);
            
            const args = JSON.parse(toolCall.function.arguments);
            const assistantId = args.assistantId;
            
            response.action = "call_assistant";

            debugThread(`Calling assistant: ${functionName}(${JSON.stringify(args)})`);

            const callAssistantResponse = await callAssistant({
              assistantId: assistantId,
              threadId: this.id
            });

            if (!callAssistantResponse.run) {
              throw new Error("Run is not defined in callAssistantResponse");
            }

            response.result = callAssistantResponse.assistant.message.text;
            response.runId = callAssistantResponse.run.id;
            response.action = "call_assistant";

            return response;
          }

          if (functionMap) {
            if (functionName in functionMap) {
              const args = JSON.parse(toolCall.function.arguments);

              if (functionName in argumentMap) {
                const additionalArgs = argumentMap[functionName as string];
                for (const key in additionalArgs) {
                  if (Object.prototype.hasOwnProperty.call(additionalArgs, key)) {
                    args[key] = additionalArgs[key];
                  }
                }
              }

              debugThread(`Run function: ${functionName}(${JSON.stringify(args)})`);

              const result = await functionMap[functionName](args);

              response.function = functionName;
              response.arguments = JSON.stringify(args, null, 2);
              response.result = JSON.stringify(result, null, 2);

              debugThread(`Result of function: ${JSON.stringify(result, null, 2)}`);

              const resultOfSubmitToolOutputs = await this.openai.beta.threads.runs.submitToolOutputs(this.id, run.id, {
                tool_outputs: [
                  {
                    tool_call_id: toolCall.id,
                    output: JSON.stringify(result, null, 2)
                  }
                ],
              });
            } else {
              throw new Error(`Function ${functionName} is not defined in functionMap`);
            }
          }
        }
      }
    }

    return response;
  }

  /**
   * メッセージを作成
   * @param message 送信するメッセージ
   * @returns 
   */
  async createMessage(params: { message: string }) {
    const createdMessage = await this.openai.beta.threads.messages.create(
      this.id,
      {
        role: "user",
        content: params.message
      }
    );

    return createdMessage;
  }

  /**
   * メッセージを送信
   * @param message 送信するメッセージ
   * @returns 
   */
  async run(params: { assistantId: string, functionMap: FunctionMap, argumentMap: ArgumentMap }): Promise<OpenAI.Beta.Threads.Runs.Run> {
    const functionMap = params.functionMap || null;
    const argumentMap = params.argumentMap || {};

    let assistantId = params.assistantId;
    let counter = 0;

    while (true) {
      counter++;
      if (counter > 10) {
        throw new Error("Retry count exceeded");
      }

      let run = await this.openai.beta.threads.runs.create(
        this.id,
        {
          assistant_id: assistantId,
        }
      );

      run = await this.checkRunStatus({ runId: run.id });
      while (run.status === "requires_action") {
        const response =  await this.handleRequiresAction({ run: run, functionMap: functionMap, argumentMap: argumentMap });
        
        run = await this.checkRunStatus({ runId: response.runId });
      }

      if (run.status !== "cancelled") {
        return run;
      }
    }
  }

  async retrieve() {
    if (this.id === "") {
      return null;
    }
    return await this.openai.beta.threads.retrieve(this.id);
  }

  async messages() {
    return await this.openai.beta.threads.messages.list(this.id);
  }
}

export default Thread;