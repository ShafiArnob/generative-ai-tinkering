import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import {
  OpenAIClient,
  AzureKeyCredential as OpenAIKeyCredential,
} from "@azure/openai";
import { AzureOpenAI } from "openai";
import * as dotenv from "dotenv";

dotenv.config();

class AzureSearchAssistant {
  constructor(searchConfig, openAIConfig) {
    // Azure AI Search configuration
    this.searchServiceEndpoint = searchConfig.endpoint;
    this.searchApiKey = searchConfig.apiKey;
    this.indexName = searchConfig.indexName;

    // Azure OpenAI configuration
    this.openAIEndpoint = openAIConfig.endpoint;
    this.openAIApiKey = openAIConfig.apiKey;
    this.deploymentName = openAIConfig.deploymentName;
    this.apiVersion = "2024-05-01-preview";

    // Initialize search client
    this.searchClient = new SearchClient(
      this.searchServiceEndpoint,
      // process.env["AZURE_AI_SEARCH_ENDPOINT"],
      this.indexName,
      new AzureKeyCredential(this.searchApiKey)
      // new AzureKeyCredential(process.env["AZURE_AI_SEARCH_API_KEY"])
    );

    // Initialize OpenAI client
    this.openAIClient = new OpenAIClient(
      this.openAIEndpoint,
      new OpenAIKeyCredential(this.openAIApiKey)
    );

    // this.openAIClient = new AzureOpenAI({
    //   endpoint: this.openAIEndpoint,
    //   apiKey: this.openAIApiKey,
    //   apiVersion: this.apiVersion,
    //   deployment: this.deploymentName,
    // });
  }

  // Generate vector embeddings for the query
  async generateEmbeddings(query) {
    const embeddingResponse = await this.openAIClient.getEmbeddings(
      // this.deploymentName,
      "text-embedding-3-large",
      [query]
    );
    // const embeddingResponse = await this.openAIClient.embeddings.create({
    //   model: "text-embedding-3-large",
    //   input: query,
    //   // encoding_format: "float",
    // });

    // console.log("embeddingResponse: ", JSON.stringify(embeddingResponse));
    // Output:
    // {
    //   data: [ { embedding: [-0.026297048,0.016277954,......], index: 0 } ],
    //   usage: { promptTokens: 12, totalTokens: 12 }
    // }

    return embeddingResponse.data[0].embedding;
  }

  // Perform multi-modal search (vector, keyword, and semantic)
  async searchDocuments(query) {
    try {
      // Generate vector embedding for the query
      const queryVector = await this.generateEmbeddings(query);

      // Prepare search parameters with multiple search modes
      const searchOptions = {
        vectorSearchOptions: {
          queries: [
            {
              kind: "vector",
              vector: queryVector,
              kNearestNeighborsCount: 3,
              fields: ["text_vector"],
            },
          ],
        },
        queryType: "semantic",
        semanticConfiguration: "p-test-3-semantic-configuration",
        filter: null,
        top: 5,
        select: ["title", "chunk"],
        highlightFields: "chunk",
        highlightPreTag: "<strong>",
        highlightPostTag: "</strong>",
        searchFields: ["title", "chunk"],
        queryLanguage: "en-us",
      };

      // Execute the search
      const searchResults = await this.searchClient.search(
        query,
        searchOptions
      );

      // Process and return results
      const processedResults = [];
      console.log("### Result Start ###");

      for await (const result of searchResults.results) {
        // console.log(result, "\n");

        processedResults.push({
          score: result.score,
          title: result.document.title,
          content: result.document.chunk,
          highlights: result.highlights,
        });
      }

      console.log(processedResults);

      console.log("### Result End ###");

      return processedResults;
    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  }

  // Generate AI-powered answer based on search results
  async generateAnswer(query, searchResults) {
    const context = searchResults
      .map((result) => `title: ${result.title} \n content: ${result.content}`)
      .join("\n\n");
    console.log("###  Context:   ### \n", context);

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant that provides concise and accurate answers based on the given context.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${query}\n\nProvide a comprehensive answer using only the information from the context.`,
      },
    ];

    const response = await this.openAIClient.getChatCompletions(
      this.deploymentName,
      messages,
      {
        maxTokens: 3000,
        temperature: 0.1,
        topP: 0.95,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1,
      }
    );

    return response.choices[0].message.content;
  }

  // Combine search and answer generation
  async processQuery(query) {
    try {
      // Perform multi-modal search
      const searchResults = await this.searchDocuments(query);

      // Generate AI-powered answer
      const answer = await this.generateAnswer(query, searchResults);

      return {
        searchResults,
        answer,
      };
    } catch (error) {
      console.error("Query processing error:", error);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const searchConfig = {
    endpoint: process.env["AZURE_AI_SEARCH_ENDPOINT"],
    apiKey: process.env["AZURE_AI_SEARCH_API_KEY"],
    indexName: "p-test-3",
  };

  const openAIConfig = {
    endpoint: process.env["AZURE_OPENAI_ENDPOINT"],
    apiKey: process.env["AZURE_OPENAI_API_KEY"],
    deploymentName: "gpt-4o",
  };

  const assistant = new AzureSearchAssistant(searchConfig, openAIConfig);

  try {
    const query =
      "Which contract has the shortest payment period after receipt of products?";
    const result = await assistant.processQuery(query);

    // console.log("Search Results:", result.searchResults);
    console.log("AI-Generated Answer:", result.answer);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();

// Note: Make sure to install required packages
// npm install @azure/search-documents @azure/openai
