import {
  streamText,
  UIMessage,
  convertToModelMessages,
  LanguageModelResponseMetadata,
} from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  ChatDatabaseOperation,
  ResponseMessage,
} from "@/app/actions/chatDBOperation";
import { getRetriever } from "@/lib/retriever";
import { Document } from "@langchain/core/documents";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface DocId {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const {
      id,
      messages,
      model,
      // webSearch,
      docIds, // Array of document objects
    }: {
      id: string;
      messages: UIMessage[];
      model: string;
      // webSearch: boolean;
      docIds?: DocId[]; // Optional array of document objects
    } = await req.json();

    // Get the latest user message (prompt)
    const latestMessage = (
      messages[messages.length - 1].parts[0] as { text: string }
    ).text;
    if (!latestMessage) {
      return NextResponse.json(
        { error: "No message content provided" },
        { status: 400 }
      );
    }

    let context = "";
    if (docIds && docIds.length > 0) {
      // Retrieve document chunks for each docId
      for (const doc of docIds) {
        if (doc.type !== "application/pdf") {
          console.warn(`Skipping non-PDF document: ${doc.name}`);
          continue;
        }
        try {
          const retriever = await getRetriever(doc.id);
          const retrievedDocs = await retriever.invoke(latestMessage);
          // Add document chunks to context with document name for clarity
          const docContext = retrievedDocs
            .map(
              (d: Document, index: number) =>
                `Document "${doc.name}" Chunk ${index + 1}: ${d.pageContent}`
            )
            .join("\n\n");
          context += (context ? "\n\n" : "") + docContext;
        } catch (error) {
          console.error(
            `Error retrieving chunks for document ${doc.id}:`,
            error
          );
        }
      }
    }

    // Prepare the system prompt with document context (if any)
    const systemPrompt =
      docIds && context
        ? `You are a helpful assistant that can answer questions and help with tasks. Use the following document context to inform your response:\n\n${context}`
        : "You are a helpful assistant that can answer questions and help with tasks";

    const result =  streamText({
      model: google(model),
      // tools: webSearch
      //   ? {
      //       google_search: google.tools.googleSearch({}),
      //     }
      //   : undefined,
      messages: convertToModelMessages(messages),
      system: systemPrompt,
      onFinish: async ({ usage, response }) => {
        console.log(usage, "Usage in chat API");
        await ChatDatabaseOperation({
          id,
          response: response as LanguageModelResponseMetadata & {
            readonly messages: ResponseMessage[];
            body?: unknown;
          },
          userId: user.id,
          userMessage: messages,
          usage: usage as {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
          },
        });
      },
    });

    // Send sources and reasoning back to the client
    return result.toUIMessageStreamResponse({
      sendSources: true,
      sendReasoning: true,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
