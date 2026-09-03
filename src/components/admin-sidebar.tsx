"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutDashboard, LogOut, Users, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { USER_ROLE_LABELS, type UserInfo } from "@/types/api";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/users", label: "用户管理", icon: Users },
  { href: "/rooms", label: "会议管理", icon: Video },
  { href: "/ai-roles", label: "AI 角色", icon: Bot },
] as const;

export function AdminSidebar({
  user,
  onLogout,
}: {
  user: UserInfo;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col border-r">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <span className="text-lg font-bold">BoboMeet</span>
        <span className="text-muted-foreground text-sm">管理后台</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 truncate px-3">
          <div className="text-sm font-medium">{user.nickname}</div>
          <div className="text-muted-foreground text-xs">
            {USER_ROLE_LABELS[user.role]} · {user.account}
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={onLogout}>
          <LogOut className="size-4" />
          退出登录
        </Button>
      </div>
    </aside>
  );
}
