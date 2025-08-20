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
      webSearch,
      docIds,
    }: {
      id: string;
      messages: UIMessage[];
      model: string;
      webSearch: boolean;
      docIds?: DocId[];
    } = await req.json();

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
      for (const doc of docIds) {
        if (doc.type !== "application/pdf") {
          console.warn(`Skipping non-PDF document: ${doc.name}`);
          continue;
        }
        try {
          const retriever = await getRetriever(doc.id);
          const retrievedDocs = await retriever.invoke(latestMessage);
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

    const systemPrompt =
      docIds && context
        ? `You are a helpful assistant that can answer questions and help with tasks. Use the following document context to inform your response:\n\n${context}`
        : "You are a helpful assistant that can answer questions and help with tasks";

    const result = streamText({
      model: google(model),
      tools: webSearch
        ? ({
            google_search: google.tools.googleSearch({}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        : undefined,
      messages: convertToModelMessages(messages),
      system: systemPrompt,
      maxOutputTokens: 1000,
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
