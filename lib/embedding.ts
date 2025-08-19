import { createClient } from "./supabase/server";
import pineconeClient from "./pinecone";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import supabaseAdmin from "./supabase/admin";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export const indexName = "claude-chat";

export const generateEmbeddingsInPineconeVectorStore = async (
  docId: string
) => {
  const supabase = await createClient();

  // check auth
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  let pineconeVectorStore;

  console.log("Generating embeddings...");

  const embeddingModel = new GoogleGenerativeAIEmbeddings({
    model: "models/gemini-embedding-001", // 768 dimensions
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const index = await pineconeClient.index(indexName);

  const nameSpaceAlreadyExists = await nameSpaceExists(index, docId);

  if (nameSpaceAlreadyExists) {
    console.log(
      "Namespace already exists, reusing existing embeddings" + docId
    );

    pineconeVectorStore = await PineconeStore.fromExistingIndex(
      embeddingModel,
      {
        pineconeIndex: index,
        namespace: docId,
      }
    );

    return pineconeVectorStore;
  } else {
    // if name space does not exist, create a new one, download the pdf from supabase storage download url and generate embeddings and store them in pinecode vector store
    console.log(
      "Creating new namespace and generating embeddings for " + docId
    );
  }

  const splitDocs = await generateDocs(docId);

  console.log(
    `storing the embedding in namespace ${docId} in the ${indexName} index pinecone vector store`
  );

  pineconeVectorStore = await PineconeStore.fromDocuments(
    splitDocs,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
    embeddingModel,
    {
      pineconeIndex: index,
      namespace: docId,
    }
  );

  console.log("Embeddings generated and stored successfully");

  return pineconeVectorStore;
};

const generateDocs = async (docId: string) => {
  // check auth
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  //fetching download url from supabase storage
  // pdfs stored in documents bucket in userId/pdfs/docId and need download url

  const { data, error } = await supabaseAdmin
    .from("uploaded_files")
    .select("public_url")
    .eq("id", docId)
    .single();

  if (error) {
    console.error("Error fetching document download URL:", error);
    throw new Error("Failed to fetch document download URL");
  }

  const downloadUrl = data?.public_url;

  if (!downloadUrl) {
    throw new Error("Download URL not found for the document");
  }

  console.log("Download URL:", downloadUrl);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }

  const pdfblob = await response.blob();

  //loading pdf document

  const loader = new PDFLoader(pdfblob);

  const docs = await loader.load();

  //splitting the document into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });

  const splitDocs = await splitter.splitDocuments(docs);
  console.log("Split documents:", splitDocs.length, "chunks created");

  return splitDocs;
};

const nameSpaceExists = async (
  index: Index<RecordMetadata>,
  namespace: string
) => {
  if (namespace === null) throw new Error("Namespace cannot be null");

  const { namespaces } = await index.describeIndexStats();

  return namespaces?.[namespace] !== undefined;
};