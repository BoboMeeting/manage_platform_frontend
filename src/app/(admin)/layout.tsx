"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/types/api";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 管理端接口要求 Operator 及以上（后端策略 Policies.OperatorPlus）
  if (user.role < UserRole.Operator) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <ShieldAlert className="size-12 text-destructive" />
          <div>
            <h1 className="text-lg font-semibold">无管理后台访问权限</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              当前账号（{user.account}
              ）为普通用户/观察员角色，管理后台仅限运营及以上角色访问。
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            退出并切换账号
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={user} onLogout={logout} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
