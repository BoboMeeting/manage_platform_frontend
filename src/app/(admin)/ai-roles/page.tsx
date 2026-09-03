"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteAiRole, listAiRoles } from "@/lib/api/ai-roles";
import { ApiError } from "@/lib/api/client";
import type { AiRole } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiRoleDialog } from "./ai-role-dialog";

export default function AiRolesPage() {
  const [roles, setRoles] = useState<AiRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiRole | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await listAiRoles());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载 AI 角色失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(role: AiRole) {
    setEditing(role);
    setDialogOpen(true);
  }

  async function onDelete(role: AiRole) {
    if (!window.confirm(`确定删除 AI 角色「${role.name}」吗？`)) return;
    try {
      await deleteAiRole(role.id);
      toast.success("已删除");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI 角色</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            共 {roles.length} 个角色模板
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            新建角色
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          加载中…
        </div>
      ) : roles.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-16 text-center text-sm">
          暂无 AI 角色，点击「新建角色」创建
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="gap-3">
              <CardHeader className="gap-1">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{role.name}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(role)}
                      title="编辑"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(role)}
                      title="删除"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>{role.description ?? "—"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground line-clamp-3 text-xs">
                  {role.promptTemplate}
                </p>
                {role.ttsConfig && (
                  <p className="bg-muted text-muted-foreground line-clamp-1 rounded px-2 py-1 font-mono text-[11px]">
                    {role.ttsConfig}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AiRoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editing}
        onSaved={load}
      />
    </div>
  );
}
