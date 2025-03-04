import {
  SearchClient,
  SearchIndexClient,
  SearchIndexerClient,
  AzureKeyCredential,
} from "@azure/search-documents";
import * as dotenv from "dotenv";

dotenv.config();

// To query and manipulate documents
const searchClient = new SearchClient(
  process.env["AZURE_AI_SEARCH_ENDPOINT"],
  "p-test-3",
  new AzureKeyCredential(process.env["AZURE_AI_SEARCH_API_KEY"])
);

const searchResults = await searchClient.search(
  "Which contract has the shortest payment period after receipt of products?",
  {
    select: ["title", "chunk"],
    top: 10,
  }
);

for await (const result of searchResults.results) {
  console.log(result);
}

console.log(searchResults);
