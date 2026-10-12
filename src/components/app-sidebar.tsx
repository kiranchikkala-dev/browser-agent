"use client";

import * as React from "react";
import { Clock3, Loader2, Plus } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { getTasks } from "@/lib/tasks";
import type { Task } from "@/lib/task-types";
import { usePathname, useRouter } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, openMobile } = useSidebar();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const loadTasks = React.useCallback(async () => {
    try {
      setTasks(await getTasks());
    } catch {
      /* show empty state */
    } finally {
      setIsLoading(false);
    }
  }, []);
  React.useEffect(() => {
    if (isMobile && !openMobile) return;
    const initialLoad = window.setTimeout(() => void loadTasks(), 0);
    const refresh = () => void loadTasks();
    window.addEventListener("tasks:changed", refresh);
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("tasks:changed", refresh);
      window.clearInterval(interval);
    };
  }, [isMobile, loadTasks, openMobile]);
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="p-3">
        <Button
          className="justify-start gap-2"
          onClick={() => router.push("/")}
        >
          <Plus />
          New task
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Recent tasks</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <div
                className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground"
                role="status"
              >
                <Loader2 className="size-3.5 animate-spin" /> Loading tasks…
              </div>
            ) : tasks.length === 0 ? (
              <p className="px-2 py-3 text-xs leading-5 text-muted-foreground">
                Your submitted tasks will appear here.
              </p>
            ) : (
              <SidebarMenu>
                {tasks.map((task) => (
                  <SidebarMenuItem key={task.id}>
                    <SidebarMenuButton
                      isActive={pathname === `/task/${task.id}`}
                      onClick={() => router.push(`/task/${task.id}`)}
                      title={task.prompt}
                    >
                      <Clock3 className="text-muted-foreground" />
                      <span>{task.prompt}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
