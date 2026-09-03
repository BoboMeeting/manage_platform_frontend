"use client";

import Link from "next/link";
import { Bot, Users, Video } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const QUICK_LINKS = [
  {
    href: "/users",
    title: "用户管理",
    description: "查看、创建用户，重置密码，启用/禁用账号",
    icon: Users,
  },
  {
    href: "/rooms",
    title: "会议管理",
    description: "查看所有会议房间，取消异常会议",
    icon: Video,
  },
  {
    href: "/ai-roles",
    title: "AI 角色",
    description: "维护 AI 角色模板：Prompt、TTS 音色配置",
    icon: Bot,
  },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          欢迎，{user?.nickname ?? "管理员"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          BoboMeet 会议系统管理平台
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-5" />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">开发提示</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1 text-sm">
          <p>· 前端通过 Next.js 代理同源访问 /api/*，转发到后端 http://localhost:5080</p>
          <p>· JWT 保存在浏览器 localStorage，请求自动携带 Authorization 头</p>
          <p>· 管理接口要求运营（Operator）及以上角色，角色变更仅超级管理员可操作</p>
        </CardContent>
      </Card>
    </div>
  );
}
