"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account.trim() || !password) {
      toast.error("请输入账号和密码");
      return;
    }
    setSubmitting(true);
    try {
      await login(account.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">BoboMeet 管理后台</CardTitle>
          <CardDescription>请使用运营或超级管理员账号登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">账号</Label>
              <Input
                id="account"
                placeholder="邮箱 / 手机号"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              登录
            </Button>
          </form>
          <p className="bg-muted text-muted-foreground mt-4 rounded-md px-3 py-2 text-xs">
            默认超级管理员：admin@bobomeet.io / admin123
            <br />
            首次登录后请尽快修改密码
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
