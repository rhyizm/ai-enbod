import Assistant, { IAssistantChatResponse } from "../assistant";
import functionMap from "../functionMap";

const callAssistant = async (params: { assistantId: string, threadId: string }): Promise<IAssistantChatResponse> => {
  const assistant = new Assistant({
    assistantId: params.assistantId,
    functionMap: functionMap,
  });

  const response = await assistant.chat({
    userMessage: "",
    threadId: params.threadId,
  })

  return response;
};

export default callAssistant;