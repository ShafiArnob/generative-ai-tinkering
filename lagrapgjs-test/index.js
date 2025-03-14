import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { AzureChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import * as dotenv from "dotenv";
import { ToolMessage } from "@langchain/core/messages";

dotenv.config();

const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
const apiKey = process.env["AZURE_OPENAI_API_KEY"];
const apiVersion = "2024-05-01-preview";
const deployment = "gpt-4o-mini";

const llm = new AzureChatOpenAI({
  azureOpenAIEndpoint: endpoint,
  azureOpenAIApiKey: apiKey,
  azureOpenAIApiVersion: apiVersion,
  azureOpenAIApiDeploymentName: deployment,
});

const multiply = tool(
  async ({ a, b }) => {
    return `${a * b}`;
  },
  {
    name: "multiply",
    description: "multiplies two numbers together",
    schema: z.object({
      a: z.number("the first number"),
      b: z.number("the second number"),
    }),
  }
);

const add = tool(
  async ({ a, b }) => {
    return `${a + b}`;
  },
  {
    name: "add",
    description: "adds two numbers together",
    schema: z.object({
      a: z.number("the first number"),
      b: z.number("the second number"),
    }),
  }
);

const divide = tool(
  async ({ a, b }) => {
    return `${a / b}`;
  },
  {
    name: "divide",
    description: "divides two numbers",
    schema: z.object({
      a: z.number("the first number"),
      b: z.number("the second number"),
    }),
  }
);

// Augment the LLM with tools
const tools = [multiply, add, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools); // it knows what tools are available

// Node
async function llmCall(state) {
  const res = await llmWithTools.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant tasked with performing arithmetic on a set if inputs.",
    },
    ...state.messages,
  ]);
  return {
    messages: [res],
  };
}

async function toolNode(state) {
  const results = [];
  const lastMessage = state.messages.at(-1);

  if (lastMessage?.tool_calls?.length) {
    for (const toolCall of lastMessage.tool_calls) {
      const tool = toolsByName[toolCall.name];
      const observation = await tool.invoke(toolCall.args);
      results.push(
        new ToolMessage({
          content: observation,
          tool_call_id: toolCall.id,
        })
      );
    }
  }

  return { messages: results };
}

// conditional state
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  return "__end__";
}

const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, {
    Action: "tools",
    __end__: "__end__",
  })
  .addEdge("tools", "llmCall")
  .compile();

const messages = [
  {
    role: "user",
    content: "add 10 and 10 the multiply that by 10 and divide by 2",
  },
];

const results = await agentBuilder.invoke({ messages });
console.log(results);
