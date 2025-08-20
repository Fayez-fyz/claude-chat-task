import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronUp, LogOut, User } from "lucide-react";
import { logoutAction } from "@/app/actions/supabaseLogout";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import { UIDataTypes, UIMessage, UITools } from "ai";
import { ChatSessionList } from "./chat/chat.sessions";
interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export function AppSidebar({
  chatSessions,
  userProfile,
  messages,
  chatId,
  ...props
}: {
  chatSessions:
    | {
        id: string;
        chat_name: string;
      }[]
    | undefined;
  userProfile?: UserProfile;
  messages: UIMessage<unknown, UIDataTypes, UITools>[];
  chatId: string | undefined;
} & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} className="!bg-[#1f1e1d]">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex justify-between items-center">
            <SidebarMenuButton className=" !px-2 !py-1  " size="lg" asChild>
              <a href="#">
                <div className="flex flex-col gap-0.5 leading-none">
                  <h2 className="text-xl font-semibold">Claude</h2>
                </div>
              </a>
            </SidebarMenuButton>
            <Link
              href={`/chat/${messages.length > 0 ? uuidv4() : chatId}`}
              className="bg-tertiary rounded-full p-1.5 hover:bg-tertiary/80 transition-colors"
            >
              <Plus className="h-4 w-4 text-white" />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ChatSessionList chatSessions={chatSessions} messages={messages} />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-[#0f0f0e] hover:text-white bg-[#0f0f0e] text-white "
                >
                  <div className="flex items-center gap-2 flex-1">
                    {userProfile?.avatar ? (
                      <Image
                        src={userProfile.avatar}
                        alt={userProfile.name || "User"}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-sidebar-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-sidebar-primary" />
                      </div>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      {/* <span className="truncate font-semibold">
                        {userProfile?.name || "User"}
                      </span> */}
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {userProfile?.email || "user@example.com"}
                      </span>
                    </div>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg"
              >
                <DropdownMenuItem asChild>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
