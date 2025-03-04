import { AzureOpenAI } from "openai";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // You will need to set these environment variables or edit the following values
  const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
  const apiKey = process.env["AZURE_OPENAI_API_KEY"];
  const apiVersion = "2024-05-01-preview";
  const deployment = "gpt-4o-mini"; // This must match your deployment name

  const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

  const result = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an AI assistant that helps people find information.",
      },
    ],
    max_tokens: 800,
    temperature: 0.7,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: null,
  });

  console.log(JSON.stringify(result, null, 2));
}

// Call the main function
main().catch(console.error);
