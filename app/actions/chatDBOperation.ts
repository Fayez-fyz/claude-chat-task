import { createClient } from "@/lib/supabase/server";
import {
  LanguageModelResponseMetadata,
  UIDataTypes,
  UIMessage,
  UITools,
} from "ai";

export interface ResponseMessage {
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  id: string;
}

interface ChatDatabaseOperationParams {
  id: string;
  response: LanguageModelResponseMetadata & {
    readonly messages: Array<ResponseMessage>;
    body?: unknown;
  };
  userId: string;
  userMessage: UIMessage<unknown, UIDataTypes, UITools>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export const ChatDatabaseOperation = async ({
  id,
  response,
  userId,
  userMessage,
  usage,
}: ChatDatabaseOperationParams): Promise<void> => {
  const supabase = await createClient();

  const lastUserMessage = userMessage[userMessage.length - 1];

  try {
  
    const { data: chatSession, error: chatSessionError } = await supabase
      .from("chat_session")
      .select("id")
      .eq("id", id)
      .single();

    if (chatSessionError || !chatSession) {
      const { error: createError } = await supabase
        .from("chat_session")
        .insert({
          id,
          user_id: userId,
          chat_name: (
            lastUserMessage?.parts[0] as { text: string }
          )?.text.slice(0, 50), 
        });

      if (createError) {
        throw new Error(
          `Failed to create chat session: ${createError.message}`
        );
      }
    }

    const { data: userMessageData, error: userMessageError } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: id,
        user_id: userId,
        role: lastUserMessage.role,
        content:
          lastUserMessage.parts[0]?.type === "text"
            ? lastUserMessage.parts[0]?.text || ""
            : "", 
        parts: lastUserMessage.parts || [], 
        tokens: usage?.inputTokens || 0,
      })
      .select("id")
      .single();

    if (userMessageError || !userMessageData) {
      throw new Error(
        `Failed to store user message: ${
          userMessageError?.message || "Unknown error"
        }`
      );
    }

    
    console.log(response  ,'response.messages');
    const assistantMessage = response.messages[response.messages.length - 1];

    const { error: assistantMessageError } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: id,
        user_id: userId,
        role: "assistant",
        content: assistantMessage.content[0]?.text || "",
        parts: assistantMessage.content || [], 
        tokens: usage?.outputTokens || 0,
        parent_id: userMessageData.id, 
      });

    if (assistantMessageError) {
      throw new Error(
        `Failed to store assistant message: ${assistantMessageError.message}`
      );
    }
  } catch (error) {
    console.error("Chat database operation error:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error in chat database operation");
  }
};
