"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createUser, type CreateUserPayload } from "@/lib/api/users";
import { AccountKind, UserRole } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_OPTIONS = [
  { value: UserRole.User, label: "普通用户" },
  { value: UserRole.Observer, label: "观察员" },
  { value: UserRole.Operator, label: "运营" },
  { value: UserRole.SuperAdmin, label: "超级管理员" },
];

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.User);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAccount("");
    setPassword("");
    setNickname("");
    setRole(UserRole.User);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account.trim() || password.length < 6) {
      toast.error("账号必填，密码长度至少 6 位");
      return;
    }
    const payload: CreateUserPayload = {
      account: account.trim(),
      password,
      nickname: nickname.trim() || undefined,
      accountKind: account.includes("@") ? AccountKind.Email : AccountKind.Phone,
      role,
    };
    setSubmitting(true);
    try {
      await createUser(payload);
      toast.success("用户创建成功");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>
            只能创建角色权限低于当前账号的用户
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-account">账号（邮箱或手机号）</Label>
            <Input
              id="new-account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="例如 admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">初始密码（至少 6 位）</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-nickname">昵称（可选）</Label>
            <Input
              id="new-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role">角色</Label>
            <select
              id="new-role"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={role}
              onChange={(e) => setRole(Number(e.target.value) as UserRole)}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
