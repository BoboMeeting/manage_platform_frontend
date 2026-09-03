"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  disableUser,
  enableUser,
  listUsers,
  resetPassword,
} from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  UserRole,
  UserStatus,
  type UserInfo,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "./create-user-dialog";

const SELECT_CLASS =
  "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function UsersPage() {
  // 输入中的筛选条件
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  // 已应用的筛选条件（点击“查询”后生效）
  const [applied, setApplied] = useState({ keyword: "", role: "", status: "" });

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUsers({
        keyword: applied.keyword || undefined,
        role: applied.role === "" ? undefined : (Number(applied.role) as UserRole),
        status:
          applied.status === ""
            ? undefined
            : (Number(applied.status) as UserStatus),
      });
      setUsers(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters() {
    setApplied({ keyword, role, status });
  }

  async function toggleStatus(user: UserInfo) {
    try {
      if (user.status === UserStatus.Active) {
        await disableUser(user.id);
        toast.success(`已禁用 ${user.nickname}`);
      } else {
        await enableUser(user.id);
        toast.success(`已启用 ${user.nickname}`);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  async function onResetPassword(user: UserInfo) {
    const pwd = window.prompt(`为「${user.nickname}」设置新密码（至少 6 位）`);
    if (pwd === null) return;
    if (pwd.length < 6) {
      toast.error("密码长度至少 6 位");
      return;
    }
    try {
      await resetPassword(user.id, pwd);
      toast.success("密码已重置");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "重置失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">用户管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            共 {users.length} 个用户
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          新建用户
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-64"
          placeholder="搜索昵称 / 账号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <select
          className={SELECT_CLASS}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">全部角色</option>
          <option value={UserRole.User}>普通用户</option>
          <option value={UserRole.Observer}>观察员</option>
          <option value={UserRole.Operator}>运营</option>
          <option value={UserRole.SuperAdmin}>超级管理员</option>
        </select>
        <select
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value={UserStatus.Active}>启用</option>
          <option value={UserStatus.Disabled}>禁用</option>
        </select>
        <Button variant="outline" onClick={applyFilters}>
          <Search className="size-4" />
          查询
        </Button>
      </div>

      <div className="rounded-lg border">
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            加载中…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-10 text-center"
                  >
                    暂无用户数据
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.nickname}</div>
                      <div className="text-muted-foreground text-xs">
                        {u.account}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {USER_ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.status === UserStatus.Active ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          {USER_STATUS_LABELS[u.status]}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {USER_STATUS_LABELS[u.status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResetPassword(u)}
                        >
                          <KeyRound className="size-4" />
                          重置密码
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            u.status === UserStatus.Active
                              ? "destructive"
                              : "outline"
                          }
                          onClick={() => toggleStatus(u)}
                        >
                          {u.status === UserStatus.Active ? "禁用" : "启用"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />
    </div>
  );
}
