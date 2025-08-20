"use client";

import { MoreHorizontal, Search } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";
import { UIDataTypes, UIMessage, UITools } from "ai";
export function ChatSessionList({
  chatSessions,
  messages,
}: {
  chatSessions:
    | {
        id: string;
        chat_name: string;
      }[]
    | undefined;
     messages:UIMessage<unknown, UIDataTypes, UITools>[];
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState("");
  const supabase = createClient();
  const queryClient = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const { error } = await supabase
        .from("chat_session")
        .update({ chat_name: newName })
        .eq("id", id);

      if (error) throw error;
      return { id, newName };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
      setEditingSessionId(null);
      setNewChatName("");
      toast.success("Chat session renamed successfully");
    },
    onError: (error) => {
      console.error("Error renaming chat session:", error);
      toast.error("Failed to rename chat session");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("chat_id", sessionId);

      if (messagesError) throw messagesError;

      const { error: sessionError } = await supabase
        .from("chat_session")
        .delete()
        .eq("id", sessionId);

      if (sessionError) throw sessionError;
    },
    onSuccess: (_, deletedSessionId) => {
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
      toast.success("Chat session deleted successfully");
      
      if (id === deletedSessionId) {
        router.replace(`/chat/${uuidv4()}`);
      }
    },
    onError: (error) => {
      console.error("Error deleting chat session:", error);
      toast.error("Failed to delete chat session");
    },  // Mutation for renaming chat session
  });

  const filteredChatSessions = chatSessions?.filter((item) =>
    item.chat_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRename = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId);
    setNewChatName(currentName);
  };

  const handleRenameSubmit = (e: React.KeyboardEvent<HTMLInputElement>, sessionId: string) => {
    if (e.key === "Enter" && newChatName.trim()) {
      renameMutation.mutate({ id: sessionId, newName: newChatName.trim() });
    }
  };

  return (
    <SidebarGroup className="px-2 py-1">
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
        <input
          type="text"
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-sidebar-border bg-sidebar-background pl-10 pr-4 py-2 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:border-transparent"
        />
      </div>

      <SidebarMenu>
        {filteredChatSessions && filteredChatSessions.length ? (
           filteredChatSessions.map((item: { id: string; chat_name: string }) => (
            <SidebarMenuItem key={item.id}>
              {editingSessionId === item.id ? (
                <Input
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  onKeyDown={(e) => handleRenameSubmit(e, item.id)}
                  onBlur={() => setEditingSessionId(null)}
                  autoFocus
                  className="w-full text-sm"
                />
              ) : (
                <Link href={`/chat/${item.id}`}>
                  <DropdownMenu>
                    <SidebarMenuButton
                      className={cn(
                        "w-full justify-between data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-[#0f0f0e] hover:text-white",
                        id === item.id && "bg-[#0f0f0e] text-white"
                      )}
                    >
                      <span className="truncate">{item.chat_name}</span>
                      <DropdownMenuTrigger asChild>
                        <MoreHorizontal className="ml-auto h-4 w-4" />
                      </DropdownMenuTrigger>
                    </SidebarMenuButton>

                    <DropdownMenuContent
                      side={isMobile ? "bottom" : "right"}
                      align={isMobile ? "end" : "start"}
                      className="min-w-56 rounded-lg"
                    >
                      <DropdownMenuItem onClick={() => handleRename(item.id, item.chat_name)}>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Link>
              )}
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem className="flex justify-center items-center h-20">
            <span className="text-sm text-white/30 ">No chat sessions found</span>
          </SidebarMenuItem>
        )
         }
      </SidebarMenu>
    </SidebarGroup>
  );
}