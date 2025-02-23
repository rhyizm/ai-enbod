// src/openai/assistants/index.ts
export interface AssistantMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (params: any) => Promise<any>;
}
