"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteKnowledgeBase,
  listKnowledgeBases,
  updateKnowledgeBase,
} from "@/lib/api/knowledge";
import { ApiError } from "@/lib/api/client";
import {
  KB_STATUS_LABELS,
  KbStatus,
  type KnowledgeBase,
  type KnowledgeBaseListItem,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KnowledgeBaseDialog } from "./knowledge-base-dialog";

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeBaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeBase | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listKnowledgeBases());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载知识库失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 有文档在处理中时 5s 轮询，让计数自动刷新
  const hasProcessing = items.some((it) => it.processingCount > 0);
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => {
      listKnowledgeBases()
        .then(setItems)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [hasProcessing]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(kb: KnowledgeBase) {
    setEditing(kb);
    setDialogOpen(true);
  }

  async function onToggle(kb: KnowledgeBase) {
    try {
      await updateKnowledgeBase(kb.id, { enabled: kb.status !== KbStatus.Enabled });
      toast.success(kb.status === KbStatus.Enabled ? "已停用（检索不再命中该库）" : "已启用");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  async function onDelete(kb: KnowledgeBase) {
    if (
      !window.confirm(
        `确定删除知识库「${kb.name}」吗？其文档、片段与原文件将一并删除，且不可恢复。`
      )
    )
      return;
    try {
      await deleteKnowledgeBase(kb.id);
      toast.success("已删除");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  const totalDocuments = items.reduce((sum, it) => sum + it.documentCount, 0);
  const totalFailed = items.reduce((sum, it) => sum + it.failedCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BookOpen className="size-6" />
            知识库
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            共 {items.length} 个知识库 · {totalDocuments} 篇文档 · 失败 {totalFailed}
            {hasProcessing && " · 有文档处理中（自动刷新）"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            新建知识库
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          加载中…
        </div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-16 text-center text-sm">
          暂无知识库，点击「新建知识库」创建
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>文档</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>切分参数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-40 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(({ knowledgeBase: kb, documentCount, readyCount, processingCount, failedCount }) => (
                <TableRow key={kb.id}>
                  <TableCell>
                    <Link
                      href={`/knowledge/${kb.id}`}
                      className="hover:text-primary font-medium hover:underline"
                    >
                      {kb.name}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {kb.description ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>共 {documentCount}</div>
                    <div className="text-muted-foreground">
                      就绪 {readyCount}
                      {processingCount > 0 && ` · 处理中 ${processingCount}`}
                      {failedCount > 0 && ` · 失败 ${failedCount}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={kb.status === KbStatus.Enabled}
                        onChange={() => onToggle(kb)}
                      />
                      <Badge variant={kb.status === KbStatus.Enabled ? "default" : "secondary"}>
                        {KB_STATUS_LABELS[kb.status] ?? "未知"}
                      </Badge>
                    </label>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {kb.chunkSize} / {kb.chunkOverlap} · {kb.embeddingModel} ({kb.embeddingDim}d)
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(kb.createdAt).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(kb)}
                        title="编辑"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(kb)}
                        title="删除"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <KnowledgeBaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kb={editing}
        onSaved={load}
      />
    </div>
  );
}
