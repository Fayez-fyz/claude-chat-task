"use client";
import { FC, useEffect, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat.input";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { fetchAllChatSessions, fetchChatMessages } from "@/lib/supabase/queries/chat.queries";
import { useQuery } from "@tanstack/react-query";
import { useFileUpload } from "@/hooks/useFileUpload";
import { createClient } from "@/lib/supabase/client";
import { getQueryClient } from "@/hooks/get-query-client";

const models = [
  {
    name: "Gemini 2.5 Flash-Lite",
    value: "gemini-2.5-flash-lite",
  },
  {
    name: "Gemini 2.5 Flash",
    value: "gemini-2.5-flash",
  },
  {
    name: "Gemini 2.5 Pro",
    value: "gemini-2.5-pro",
  },
];

interface ChatMainProps {
  chatId?: string;
  userId?: string;
  userProfile?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface MessageData {
  text: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
}

const ChatMain: FC<ChatMainProps> = ({ chatId, userId, userProfile }) => {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = getQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const hasNavigated = useRef(false);
  const currentChatId = useRef(chatId);

  // File upload hook
  const { attachedFiles, isUploading, uploadFiles, removeFile } = useFileUpload({
    userId,
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    onFilesChange: (files) => {
      console.log("Files changed:", files);
    },
  });

  // Only fetch chat messages if we have a valid chatId
const { data: chatMessages } = useQuery({
  queryKey: ["chat_messages", currentChatId.current ?? ""],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryFn: () => fetchChatMessages(supabase as any, currentChatId.current ?? ""),
  enabled: !!currentChatId.current && currentChatId.current !== "",
});
  const { data: chatSessions } = useQuery({
    queryKey: ["chat_sessions", userId],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => fetchAllChatSessions(supabase as any, userId as string),
    enabled: !!userId,
  });

  const { messages, sendMessage, status } = useChat({
    messages: chatMessages || [],
    generateId: () => uuidv4(),
    id: currentChatId.current || undefined,
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: () => {
      console.log("Chat finished");
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare the message data with file attachments
    const messageData: MessageData = {
      text: input,
    };

    // Prepare docIds array from attachedFiles
    const docIds = attachedFiles.length > 0
      ? attachedFiles.map((file) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          size: file.size,
          type: "application/pdf",
        }))
      : undefined;

    // Add file attachments to messageData if any
    if (attachedFiles.length > 0) {
      messageData.attachments = docIds;
    }

    // Navigate to chat/[sessionId] if we're still on /chat
    if (!chatId && !hasNavigated.current && currentChatId.current) {
      hasNavigated.current = true;
      if (input.trim()) {
        router.replace(`/chat/${currentChatId.current}`);
        sendMessage(messageData, {
          body: {
            model: model,
            webSearch: webSearch,
            files: attachedFiles.length > 0 ? attachedFiles : undefined,
            docIds, // Include docIds array
          },
        });
        setInput("");
      }
    } else {
      // If chatId is provided, send message directly
      if (input.trim()) {
        sendMessage(messageData, {
          body: {
            model: model,
            webSearch: webSearch,
            files: attachedFiles.length > 0 ? attachedFiles : undefined,
            docIds, // Include docIds array
          },
        });
        setInput("");
      }
    }
  };

  // Generate session ID once and reuse it
  useEffect(() => {
    if (chatId) {
      currentChatId.current = chatId;
    } else if (!currentChatId.current) {
      currentChatId.current = uuidv4();
    }
  }, [chatId]);

  return (
    <>
      <SidebarProvider
        className="flex h-screen w-full flex-col md:flex-row"
        defaultOpen={sidebarOpen}
        open={sidebarOpen}
        onOpenChange={(open) => setSidebarOpen(open)}
      >
        <AppSidebar
          chatSessions={chatSessions || []}
          userProfile={userProfile}
          className="hidden md:block"
          style={{
            width: "var(--sidebar-width)",
          }}
        />
        <SidebarInset
          className={cn(
            "flex-1 md:pl-[var(--sidebar-width)] md:pr-0 transition-all duration-300 ease-in-out",
            !sidebarOpen ? "md:pl-0" : ""
          )}
          style={{
            transitionDelay: sidebarOpen ? "0.3s" : "0s",
          }}
        >
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
          </header>
          <div className="max-w-4xl mx-auto p-6 relative size-full h-screen overflow-hidden">
            <div
              className={cn(
                "flex flex-col h-full gap-10",
                messages.length === 0 ? "justify-center gap-10" : ""
              )}
            >
              <ChatMessages messages={messages} status={status} />
              <ChatInput
                input={input}
                setInput={setInput}
                model={model}
                setModel={setModel}
                webSearch={webSearch}
                setWebSearch={setWebSearch}
                handleSubmit={handleSubmit}
                status={status}
                models={models}
                attachedFiles={attachedFiles}
                isUploading={isUploading}
                uploadFiles={uploadFiles}
                removeFile={removeFile}
              />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

export default ChatMain;