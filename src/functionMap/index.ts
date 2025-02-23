// src/openai/functions/index.ts
import { cat, tree } from "./commands";
import callAssistant from "./callAssistant";

export interface FunctionMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (params: any) => Promise<any>;
}

export interface ArgumentMap {
  [functionName: string]: { [key: string]: string };
}

const functionMap: FunctionMap = {
  cat: cat,
  tree: tree,
  callAssistant: callAssistant,
};

export { callAssistant };

export default functionMap;
