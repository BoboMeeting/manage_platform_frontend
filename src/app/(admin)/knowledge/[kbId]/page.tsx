"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteDocument,
  getKnowledgeBase,
  listDocuments,
  retryDocument,
  updateKnowledgeBase,
} from "@/lib/api/knowledge";
import { formatBytes } from "@/lib/api/videos";
import { ApiError } from "@/lib/api/client";
import {
  KB_DOCUMENT_PROCESSING_STATUSES,
  KB_DOCUMENT_STATUS_LABELS,
  KB_STATUS_LABELS,
  KbDocumentStatus,
  KbStatus,
  type KbDocument,
  type KnowledgeBase,
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
import { KnowledgeBaseDialog } from "../knowledge-base-dialog";
import { DocumentDetailDialog } from "../document-detail-dialog";
import { SearchDebugDialog } from "../search-debug-dialog";
import { UploadDocumentDialog } from "../upload-document-dialog";

const STATUS_BADGE_VARIANT: Record<
  number,
  "default" | "secondary" | "destructive"
> = {
  [KbDocumentStatus.Ready]: "default",
  [KbDocumentStatus.Failed]: "destructive",
};

function isProcessing(status: KbDocumentStatus): boolean {
  return (KB_DOCUMENT_PROCESSING_STATUSES as readonly number[]).includes(status);
}

export default function KnowledgeDetailPage() {
  const params = useParams<{ kbId: string }>();
  const kbId = params.kbId;

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kbInfo, docs] = await Promise.all([
        getKnowledgeBase(kbId),
        listDocuments(kbId, page, pageSize),
      ]);
      setKb(kbInfo);
      setDocuments(docs.items);
      setTotal(docs.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载知识库失败");
    } finally {
      setLoading(false);
    }
  }, [kbId, page]);

  useEffect(() => {
    load();
  }, [load]);

  // 有文档处理中时 5s 轮询文档列表
  const hasProcessing = documents.some((d) => isProcessing(d.status));
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => {
      listDocuments(kbId, page, pageSize)
        .then((res) => {
          setDocuments(res.items);
          setTotal(res.total);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [hasProcessing, kbId, page]);

  async function onToggle() {
    if (!kb) return;
    try {
      const updated = await updateKnowledgeBase(kb.id, {
        enabled: kb.status !== KbStatus.Enabled,
      });
      setKb(updated);
      toast.success(updated.status === KbStatus.Enabled ? "已启用" : "已停用（检索不再命中该库）");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  async function onRetry(doc: KbDocument) {
    try {
      await retryDocument(kbId, doc.id);
      toast.success("已重新提交解析");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "重试失败");
    }
  }

  async function onDelete(doc: KbDocument) {
    if (!window.confirm(`确定删除文档「${doc.title}」吗？其片段与原文件将一并删除。`))
      return;
    try {
      await deleteDocument(kbId, doc.id);
      toast.success("已删除");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const readyCount = documents.filter((d) => d.status === KbDocumentStatus.Ready).length;
  const failedCount = documents.filter((d) => d.status === KbDocumentStatus.Failed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/knowledge"
            className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="size-3" />
            返回知识库列表
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FileText className="size-6" />
            {kb?.name ?? "知识库详情"}
            {kb && (
              <Badge variant={kb.status === KbStatus.Enabled ? "default" : "secondary"}>
                {KB_STATUS_LABELS[kb.status] ?? "未知"}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {kb ? (
              <>
                {kb.description ?? "无描述"} · 模型 {kb.embeddingModel}（{kb.embeddingDim}d） ·
                切分 {kb.chunkSize}/{kb.chunkOverlap}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
          {kb && (
            <>
              <Button variant="outline" onClick={onToggle}>
                {kb.status === KbStatus.Enabled ? "停用" : "启用"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                编辑
              </Button>
              <Button variant="outline" onClick={() => setSearchOpen(true)}>
                <Search className="size-4" />
                检索调试
              </Button>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="size-4" />
                上传文档
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        共 {total} 篇文档 · 本页就绪 {readyCount} · 失败 {failedCount}
        {hasProcessing && " · 处理中（自动刷新）"}
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          加载中…
        </div>
      ) : documents.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-16 text-center text-sm">
          暂无文档，点击「上传文档」开始
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>片段数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-40 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <button
                      className="hover:text-primary hover:underline"
                      onClick={() => setDetailId(doc.id)}
                      title="查看详情与处理流水"
                    >
                      {doc.title}
                    </button>
                    <div className="text-muted-foreground text-xs">
                      {doc.originalFileName} · {formatBytes(doc.fileSizeBytes)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_BADGE_VARIANT[doc.status] ?? "secondary"}
                      title={doc.errorMessage ?? undefined}
                    >
                      {KB_DOCUMENT_STATUS_LABELS[doc.status] ?? "未知"}
                    </Badge>
                    {doc.errorMessage && (
                      <div
                        className="text-destructive mt-1 max-w-48 truncate text-xs"
                        title={doc.errorMessage}
                      >
                        {doc.errorMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{doc.chunkCount}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(doc.createdAt).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {doc.status === KbDocumentStatus.Failed && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onRetry(doc)}
                          title="重试（最多 3 次）"
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                      {!isProcessing(doc.status) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(doc)}
                          title="删除"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="text-muted-foreground flex items-center justify-end gap-3 text-sm">
          <span>
            第 {page} / {totalPages} 页
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        kbId={kbId}
        onUploaded={load}
      />
      <DocumentDetailDialog
        kbId={kbId}
        docId={detailId}
        onOpenChange={(o) => {
          if (!o) setDetailId(null);
        }}
        onChanged={load}
      />
      {kb && (
        <>
          <KnowledgeBaseDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            kb={kb}
            onSaved={load}
          />
          <SearchDebugDialog
            open={searchOpen}
            onOpenChange={setSearchOpen}
            kbId={kb.id}
            kbName={kb.name}
          />
        </>
      )}
    </div>
  );
}
