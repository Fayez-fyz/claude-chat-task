"use server";

import { generateEmbeddingsInPineconeVectorStore } from "@/lib/embedding";
import { createClient } from "@/lib/supabase/server";

export async function generateEmbedding(docId: string) {
  const supabase = await createClient();
  
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  await generateEmbeddingsInPineconeVectorStore(docId);

  return { success: true, message: "Embeddings generated successfully" };
}
