import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../database.types";

export async function fetchChatMessages(
  supabase: SupabaseClient<Database>,
  chatId: string
){
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    throw new Error("Failed to fetch chat messages");
  }
  return data.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parts: (msg.parts as any) || [],
    createdAt: new Date(msg.created_at),
  }));
}

export async function fetchAllChatSessions(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ id: string; chat_name: string }[]> {
  const { data, error } = await supabase
    .from("chat_session")
    .select("id, chat_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching chat sessions:", error);
    throw new Error("Failed to fetch chat sessions");
  }

  return data.map((session) => ({
    id: session.id,
    chat_name: session.chat_name,
  }));
}