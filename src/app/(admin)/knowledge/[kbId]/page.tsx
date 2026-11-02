"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  FileUp,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeBaseDialog } from "../knowledge-base-dialog";
import { DocumentDetailDialog } from "../document-detail-dialog";
import { SearchDebugDialog } from "../search-debug-dialog";
import { UploadDocumentDialog } from "../upload-document-dialog";
import { StageTimeline } from "../stage-timeline";
import { DeleteDocumentAlert } from "../delete-document-alert";

/** 列表行状态 Badge 的 variant 映射（用于 StageTimeline 旁的文字标签） */
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

/** Tab 筛选值 → 匹配的文档状态集合 */
const TAB_STATUS_FILTERS: Record<
  string,
  KbDocumentStatus[] | null
> = {
  all: null, // null = 不筛选
  ready: [KbDocumentStatus.Ready],
  processing: [
    KbDocumentStatus.Pending,
    KbDocumentStatus.Parsing,
    KbDocumentStatus.Indexing,
  ],
  failed: [KbDocumentStatus.Failed],
};

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

  // Tab 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<KbDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      toast.success(
        updated.status === KbStatus.Enabled ? "已启用" : "已停用（检索不再命中该库）"
      );
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

  /** 确认删除（被 AlertDialog 触发） */
  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(kbId, deleteTarget.id);
      toast.success("已删除");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  // Tab 筛选后的列表（本地过滤，不重请求后端）
  const filteredDocuments = useMemo(() => {
    const allowed = TAB_STATUS_FILTERS[statusFilter];
    if (!allowed) return documents;
    return documents.filter((d) => allowed.includes(d.status));
  }, [documents, statusFilter]);

  // Tab 计数（用当前页数据的统计，展示性即可）
  const counts = useMemo(() => {
    return {
      all: total, // total 来自后端跨页总数
      ready: documents.filter((d) => d.status === KbDocumentStatus.Ready).length,
      processing: documents.filter((d) => isProcessing(d.status)).length,
      failed: documents.filter((d) => d.status === KbDocumentStatus.Failed).length,
    };
  }, [documents, total]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
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
                {KbStatus.Enabled === 0 ? "启用" : "停用"}
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

      {/* 统计 + 自动轮询提示 */}
      <div className="text-muted-foreground text-sm">
        共 {total} 篇文档 · 本页就绪 {counts.ready} · 失败 {counts.failed}
        {hasProcessing && " · 处理中（自动刷新）"}
      </div>

      {/* 状态筛选 Tab */}
      {!loading && total > 0 && (
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">全部 {counts.all}</TabsTrigger>
            <TabsTrigger value="ready" className="data-[state=active]:!bg-emerald-500/10 data-[state=active]:!text-emerald-700 dark:data-[state=active]:!text-emerald-400">
              就绪 {counts.ready}
            </TabsTrigger>
            <TabsTrigger value="processing">
              处理中 {counts.processing}
            </TabsTrigger>
            <TabsTrigger value="failed" className="data-[state=active]:!bg-destructive/10 data-[state=active]:!text-destructive">
              失败 {counts.failed}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* 加载态 */}
      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          加载中…
        </div>
      ) : documents.length === 0 ? (
        /* 首次进入：全空引导卡片 */
        <EmptyKnowledgeBaseCard onUpload={() => setUploadOpen(true)} />
      ) : filteredDocuments.length === 0 ? (
        /* Tab 筛选后空 */
        <EmptyFilteredState
          statusFilter={statusFilter}
          onReset={() => setStatusFilter("all")}
        />
      ) : (
        /* 表格 */
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>处理进度</TableHead>
                <TableHead>片段数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-40 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
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
                    <StageTimeline status={doc.status} variant="compact" />
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
                          onClick={() => setDeleteTarget(doc)}
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

      {/* 分页（仅全量视图、非过滤态显示） */}
      {totalPages > 1 && statusFilter === "all" && (
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

      {/* 弹窗 */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        kbId={kbId}
        onUploaded={load}
        onViewExisting={(id) => setDetailId(id)}
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
      <DeleteDocumentAlert
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        documentTitle={deleteTarget?.title ?? ""}
        confirming={deleting}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

/** 首次进入知识库的空状态引导卡片 */
function EmptyKnowledgeBaseCard({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-lg border border-dashed py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileUp className="size-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">还没有文档</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        上传开始构建你的知识库，解析后即可参与智能检索
      </p>

      <div className="mx-auto mt-6 max-w-sm rounded-md bg-muted/50 p-4 text-left">
        <p className="text-xs font-medium text-foreground/80 mb-2">支持格式</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• .txt 纯文本文件</li>
          <li>• .md Markdown 文档</li>
          <li>• .docx Word 文档</li>
          <li>• .pdf PDF（需有文本层，扫描版将被拒绝）</li>
          <li className="pt-1 border-t border-muted-foreground/10">
            单文件上限：50 MB
          </li>
        </ul>
      </div>

      <Button className="mt-6" onClick={onUpload}>
        <Upload className="size-4" />
        上传文档
      </Button>
    </div>
  );
}

/** Tab 过滤后结果为空 */
function EmptyFilteredState({
  statusFilter,
  onReset,
}: {
  statusFilter: string;
  onReset: () => void;
}) {
  const label: Record<string, string> = {
    ready: "就绪",
    processing: "处理中",
    failed: "失败",
  };
  return (
    <div className="rounded-lg border py-12 text-center">
      <AlertCircle className="size-8 mx-auto text-muted-foreground/60" />
      <p className="text-muted-foreground mt-3 text-sm">
        暂无{label[statusFilter] ?? ""}的文档
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>
        查看全部
      </Button>
    </div>
  );
}
