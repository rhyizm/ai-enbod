[![npm version](https://badge.fury.io/js/@rhyizm%2Fai-enbod.svg)](https://www.npmjs.com/package/@rhyizm/ai-enbod)
[![AGPL-3.0 License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)

# AI Enbod

AI Enbod is an **API wrapper / AI Embodi Framework** designed to simplify the usage of the OpenAI Assistant API (Beta). This framework provides automated handling of Run and Thread management, as well as Function Calling (tool invocation).<br>
The framework abstracts synchronous function calling for multiple functions and workflows that involve invoking functions and assistants, enabling AI specialized in different tasks to work collaboratively. This allows for the realization of more complex workflows with simple implementations.<br>
It maps functions implemented by the user on the server side to functions registered in Function Calling, handling the execution of functions and returning results to OpenAI. Confidential arguments or those obtained server-side can be configured using the argumentMap feature.

<br>
<br>

AI Enbodは、OpenAI Assistant API（ベータ版）の使用を簡素化するために設計された **API wrapper / AI Embodi Framework** です。このフレームワークは、RunやThreadの管理、さらにFunction Calling（ツール呼び出し）の自動処理を提供します。<br>
このフレームワークは、複数の関数を同期的に呼び出すFunction Callingと、関数やアシスタントを呼び出すワークフローを抽象化しており、異なるタスクに特化したAIが連携して動作できるようにします。これにより、シンプルな実装でより複雑なワークフローを実現することが可能になります。<br>
サーバーサイドでユーザーが実装した関数をFunction Callingに登録された関数とマッピングし、関数の実行結果をOpenAI APIへ返却します。非公開にしたい引数やサーバーサイドで取得する引数は、argumentMap機能を使用して設定することができます。<br>

## Table of Contents
- [Features](#features)
  - [1. Abstraction of Complex Flows in the OpenAI Beta API](#1-abstraction-of-complex-flows-in-the-openai-beta-api)
  - [2. Automatic Handling of Function Calling (Tool Calling)](#2-automatic-handling-of-function-calling-tool-calling)
  - [3. Workflow for Calling Multiple Assistants](#3-workflow-for-calling-multiple-assistants)
- [Operating Environment](#operating-environment)
- [Installation](#installation)
- [Usage](#usage)
- [Call Another Assistant](#call-another-assistant)


---

## Features

### 1. Abstraction of Complex Flows in the OpenAI Beta API
In OpenAI Beta, very complex interactions are required, such as creating threads, generating Runs, and making tool calls when the status becomes `requires_action`.  
AI Enbod abstracts these flows with classes and methods, so that **chat and tool calls can be completed with simple method calls**.

### 2. Automatic Handling of Function Calling (Tool Calling)
Implementing the **function calling** feature proposed by OpenAI on your own can lead to cumbersome code involving mapping functions, formatting arguments, and returning results.  
AI Enbod uses mechanisms called **functionMap** and **argumentMap** to register **"function name → implementation function"**, and if instructed by the assistant, it automatically executes the corresponding function and returns the result to OpenAI.  
Arguments that you want to set in advance on the server side (such as user IDs) can be set with **argumentMap**.

### 3. Workflow for Calling Multiple Assistants
It supports not only a single assistant but also flows that link assistants together.  
You can call assistants with **other assistantIds** as needed, allowing AI specialized in different tasks to collaborate, enabling the implementation of advanced scenarios where multiple AIs work together.

---

## Operating Environment

- Node.js v18 or higher
- Any of npm / yarn / pnpm
- TypeScript 4.0 or higher recommended

**Note:** To use OpenAI Beta features, you need an environment that can access the latest beta version of OpenAI's API and an API Key.

---

## Installation

Below is an example using npm. Any preferred package manager is also fine.

```bash

npm install @rhyizm/ai-enbod

```

## Usage

Below is sample code that chats with an assistant using AI Enbod.

```typescript

import { Assistant } from '@rhyizm/ai-enbod';
import functionMap from "../src/functionMap";
import getAuthorInfo from "./getAuthorInfo";

// Set your API key in the environment variable
// No need to explicitly set the API key here if you have already set it in the environment variable

// Set your assistant ID in the environment variable
const assistantId = process.env.ASSISTANT_ID;

// Register your function to the functionMap if you want to use it in the chat
const myFunctionMap = {
  ...functionMap,
  getAuthorInfo
};

const assistant = new Assistant({
  assistantId: assistantId,
  functionMap: myFunctionMap,
  argumentMap: {
    getAuthorInfo: {
      name: "rhyizm"
    }
  },
});

const response = await assistant.chat({
  userMessage: "Tell me about your author",
});

console.log(response.assistant.message.text);
// => "My author is rhyizm. He is a software engineer."

```

## Chat Session

ChatSession allows multiple assistants to engage in a conversation with each other. This is useful for creating scenarios where assistants with different roles interact and discuss topics.

Below is an example of using ChatSession to create a discussion between two assistants:

```typescript
import { Assistant, ChatSession } from '@rhyizm/ai-enbod';

// Create assistants with different roles
const assistantA = await Assistant.create({
  assistantCreateParams: {
    name: "Assistant A",
    instructions: "You are Assistant A. Take the position that T-Rex is stronger in the discussion.",
    model: "gpt-4",
    temperature: 0.85,
  },
});

const assistantB = await Assistant.create({
  assistantCreateParams: {
    name: "Assistant B",
    instructions: "You are Assistant B. Take the position that Tarbosaurus is stronger in the discussion.",
    model: "gpt-4",
    temperature: 0.85,
  },
});

// Create a ChatSession with multiple assistants
const session = new ChatSession({assistants: [assistantA, assistantB]});

// Set the topic for discussion
session.topic = "Discuss which is stronger: T-Rex or Tarbosaurus?";

// Start the conversation loop
// The loop will continue until the session status becomes "completed"
while (session.status !== "completed") {
  await session.startLoop({ limit: 4 }); // Limit the number of exchanges
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between loops
  console.log(`Current session status: ${session.status}`);
}

// Clean up by deleting the assistants
await Assistant.delete({ assistantId: assistantA.id });
await Assistant.delete({ assistantId: assistantB.id });
```

## Call Another Assistant

By registering the callAssistant function in the Assistant of the OpenAI Assistant API, you can call other Assistants.
As needed, the callAssistant function can be used to call other Assistants, allowing the conversation to continue.

Below is an example definition of the callAssistant function.

```json

{
  "name": "callAssistant",
  "description": "{'Your Role':'Depending on the content of the conversation, an appropriate assistant will be called upon to continue the conversation.','Assistants':[{'Name':'Translator','Role':'Translates into English','ID':'asst_HjpL3IVhC4UxM2ydiAVSBL6T'}]}",
  "strict": false,
  "parameters": {
    "type": "object",
    "properties": {
      "assistantId": {
        "type": "string",
        "description": "Assistant ID to be called."
      }
    },
    "required": [
      "assistantId"
    ]
  }
}

```

## License

AGPL-3.0
