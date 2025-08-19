
import pineconeClient from "./pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { indexName } from "./embedding";
export async function getRetriever(docId: string) {
  const embeddingModel = new GoogleGenerativeAIEmbeddings({
    model: "models/gemini-embedding-001", // 768 dimensions
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const index = await pineconeClient.index(indexName);

  const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, {
    pineconeIndex: index,
    namespace: docId,
  });

  // Create a retriever with configurable parameters
  return vectorStore.asRetriever({
    k: 4, // Number of relevant documents to retrieve
    searchType: "similarity", // Use similarity search
  });
}
