/* eslint-disable @typescript-eslint/no-explicit-any */
import ChatMain from "@/components/chat/chat.main";
import { getQueryClient } from "@/hooks/get-query-client";
import {
  fetchAllChatSessions,
  fetchChatMessages,
} from "@/lib/supabase/queries/chat.queries";
import { createClient } from "@/lib/supabase/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const supabase = await createClient();
  const queryClient = getQueryClient();

  const [{ data, error }, id] = await Promise.all([
    supabase.auth.getUser(),
    (await params).id?.[0] || "",
  ]);

  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const prefetchPromises = [];

  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ["chat_sessions", data.user.id],
      queryFn: () => fetchAllChatSessions(supabase as any, data.user.id),
    })
  );

  if (id) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ["chat_messages", id],
        queryFn: () => fetchChatMessages(supabase as any, id),
      })
    );
  }

  await Promise.all(prefetchPromises);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatMain
        chatId={id || undefined}
        userId={data.user.id}
        userProfile={{
          name: data.user.user_metadata.name || "User",
          email: data.user.email || "",
          avatar: data.user.user_metadata.avatar_url || undefined,
        }}
      />
    </HydrationBoundary>
  );
}
