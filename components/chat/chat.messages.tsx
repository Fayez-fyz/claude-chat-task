import { FC } from "react";
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
import { Loader } from "@/components/ai-elements/loader";
import { ChatStatus, UIDataTypes, UIMessage, UITools } from "ai";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Bot, UserRound } from "lucide-react";

interface ChatMessagesProps {
  messages: UIMessage<unknown, UIDataTypes, UITools>[];
  status: ChatStatus;
}

const ChatMessages: FC<ChatMessagesProps> = ({ messages, status }) => {
  if (messages.length === 0) {
    return (
      <div className="flex justify-center items-center">
        <h2 className="text-4xl font-semibold">How can I help you today?</h2>
      </div>
    );
  }

  return (
    <>
      <Conversation >
        <ConversationContent>
          {messages.map((message) => {
            const sourceUrls = message.parts.filter(
              (part) => part.type === "source-url"
            );

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
                          return (
                            <Response key={`${message.id}-${i}`}>
                              {part.text}
                            </Response>
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