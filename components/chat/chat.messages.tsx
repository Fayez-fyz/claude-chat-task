import { FC, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Actions, Action } from "@/components/ai-elements/actions";
import { Loader } from "@/components/ai-elements/loader";
import { ChatStatus, UIDataTypes, UIMessage, UITools } from "ai";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Bot,
  CopyIcon,
  Download,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserRound,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import Image from "next/image";
import { getGreetings } from "@/utils/get-greetings";

interface ChatMessagesProps {
  messages: UIMessage<unknown, UIDataTypes, UITools>[];
  status: ChatStatus;
  chatId?: string;
  userProfile: {
    name: string;
    email: string;
    avatar?: string | undefined;
} | undefined
}

interface ExtendedMessage extends UIMessage<unknown, UIDataTypes, UITools> {
  is_liked?: boolean | null;
}

const ChatMessages: FC<ChatMessagesProps> = ({ messages, status, chatId, userProfile }) => {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [optimisticLikes, setOptimisticLikes] = useState<
    Record<string, boolean | null>
  >({});

  const likeMutation = useMutation({
    mutationFn: async ({
      messageId,
      isLiked,
    }: {
      messageId: string;
      isLiked: boolean | null;
    }) => {
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_liked: isLiked })
        .eq("id", messageId);

      if (error) throw error;
      return { messageId, isLiked };
    },
    onMutate: async ({ messageId, isLiked }) => {
      setOptimisticLikes((prev) => ({
        ...prev,
        [messageId]: isLiked,
      }));

      return { messageId, isLiked };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["chat_messages", chatId ?? ""],
        (oldData: ExtendedMessage[]) => {
          if (!oldData) return oldData;
          return oldData.map((msg: ExtendedMessage) =>
            msg.id === data.messageId ? { ...msg, is_liked: data.isLiked } : msg
          );
        }
      );
    },
    onError: (error, variables) => {
      setOptimisticLikes((prev) => {
        const newState = { ...prev };
        delete newState[variables.messageId];
        return newState;
      });

      console.error("Error updating message reaction:", error);
      toast.error("Failed to update message reaction");
    },
  });

  const downloadPDFMutation = useMutation({
    mutationFn: async ({
      messageContent,
      messageId,
    }: {
      messageContent: string;
      messageId: string;
    }) => {
      const pdf = new jsPDF();
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const margin = 20;
      const maxLineWidth = pageWidth - 2 * margin;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Chat Message", margin, margin);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const timestamp = new Date().toLocaleString();
      pdf.text(`Generated on: ${timestamp}`, margin, margin + 10);

      pdf.setFontSize(12);
      const lines = pdf.splitTextToSize(messageContent, maxLineWidth);
      let yPosition = margin + 30;

      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 7;
      });

      pdf.save(`chat-message-${messageId.slice(0, 8)}.pdf`);
      return { messageId };
    },
    onSuccess: () => {
      toast.success("PDF is downloading...");
    },
    onError: (error) => {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    },
  });

  const handleLike = (messageId: string, currentIsLiked?: boolean | null) => {
    const effectiveIsLiked = optimisticLikes.hasOwnProperty(messageId)
      ? optimisticLikes[messageId]
      : currentIsLiked;

    const newIsLiked = effectiveIsLiked === true ? null : true;
    likeMutation.mutate({ messageId, isLiked: newIsLiked });
  };

  const handleDislike = (
    messageId: string,
    currentIsLiked?: boolean | null
  ) => {
    const effectiveIsLiked = optimisticLikes.hasOwnProperty(messageId)
      ? optimisticLikes[messageId]
      : currentIsLiked;

    const newIsLiked = effectiveIsLiked === false ? null : false;
    likeMutation.mutate({ messageId, isLiked: newIsLiked });
  };

  const handleDownloadPDF = (messageContent: string, messageId: string) => {
    downloadPDFMutation.mutate({ messageContent, messageId });
  };

  if (messages.length === 0) {
    return (
      <div className="flex justify-center items-center gap-3">
       <div className="relative h-10 w-10">
         <Image src="/claude-color.png" alt="Claude" fill />
       </div>
        <h2 className="text-4xl font-semibold">{getGreetings()}, <span className="capitalize">{userProfile?.name}</span></h2>
      </div>
    );
  }

  return (
    <>
      <Conversation>
        <ConversationContent>
          {messages.map((message, messageIndex) => {
            const sourceUrls = message.parts.filter(
              (part) => part.type === "source-url"
            );

            const currentIsLiked = (message as ExtendedMessage)?.is_liked;
            const effectiveIsLiked = optimisticLikes.hasOwnProperty(message.id)
              ? optimisticLikes[message.id]
              : currentIsLiked;

            return (
              <div key={message.id}>
                <Message
                  className="w-full items-start "
                  from={message.role}
                  key={message.id}
                >
                  <MessageContent className="group-[.is-user]:bg-[#141413] group-[.is-assistant]:bg-[#1f1e1d]/80 group-[.is-user]:text-white text-base">
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          const isLastMessage =
                            messageIndex === messages.length - 1;
                          return (
                            <div key={`${message.id}-${i}`}>
                              <Response>{part.text}</Response>
                              {message.role === "assistant" && (
                                <Actions className="mt-2">
                                  <Action
                                    onClick={() =>
                                      handleLike(message.id, currentIsLiked)
                                    }
                                    label={
                                      effectiveIsLiked === true
                                        ? "Remove Like"
                                        : "Like"
                                    }
                                    disabled={likeMutation.isPending}
                                  >
                                    <ThumbsUpIcon
                                      className={cn(
                                        "size-4 transition-all duration-200 ease-in-out",
                                        effectiveIsLiked === true &&
                                          "text-green-500 fill-green-500"
                                      )}
                                    />
                                  </Action>
                                  <Action
                                    onClick={() =>
                                      handleDislike(message.id, currentIsLiked)
                                    }
                                    label={
                                      effectiveIsLiked === false
                                        ? "Remove Dislike"
                                        : "Dislike"
                                    }
                                    disabled={likeMutation.isPending}
                                  >
                                    <ThumbsDownIcon
                                      className={cn(
                                        "size-4 transition-all duration-200 ease-in-out",
                                        effectiveIsLiked === false &&
                                          "text-red-500 fill-red-500"
                                      )}
                                    />
                                  </Action>
                                  <Action
                                    onClick={() => {
                                      navigator.clipboard.writeText(part.text);
                                      toast.success("Text copied to clipboard");
                                    }}
                                    label="Copy"
                                  >
                                    <CopyIcon className="size-4" />
                                  </Action>
                                  <Action
                                    onClick={() =>
                                      handleDownloadPDF(part.text, message.id)
                                    }
                                    label="Download as PDF"
                                    disabled={downloadPDFMutation.isPending}
                                  >
                                    <Download className="size-4" />
                                  </Action>
                                </Actions>
                              )}
                            </div>
                          );
                        case "reasoning":
                          return (
                            <Reasoning
                              key={`${message.id}-${i}`}
                              className="w-full"
                              isStreaming={status === "streaming"}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        default:
                          return null;
                      }
                    })}
                  </MessageContent>
                  <Avatar className="group-[.is-user]:block group-[.is-assistant]:hidden size-12 ">
                    <AvatarFallback className="text-white bg-[#141413]">
                      <UserRound className="size-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <Avatar className="group-[.is-user]:hidden group-[.is-assistant]:block size-12 ">
                    <AvatarFallback className="text-white bg-[#141413]">
                      <Bot className="size-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                </Message>
                {message.role === "assistant" && sourceUrls.length > 0 && (
                  <Sources className="ml-16">
                    <SourcesTrigger count={sourceUrls.length} />
                    <SourcesContent>
                      {sourceUrls.map((sourcePart, i) => (
                        <Source
                          key={`${message.id}-source-${i}`}
                          href={sourcePart.url}
                          title={sourcePart.url}
                        />
                      ))}
                    </SourcesContent>
                  </Sources>
                )}
              </div>
            );
          })}
          {status === "submitted" && <Loader />}
        </ConversationContent>
        <ConversationScrollButton className="!bg-black/60" />
      </Conversation>
    </>
  );
};

export default ChatMessages;
