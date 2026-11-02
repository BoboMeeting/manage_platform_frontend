"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { getDocument, listDocumentEvents, retryDocument } from "@/lib/api/knowledge";
import { formatBytes } from "@/lib/api/videos";
import { ApiError } from "@/lib/api/client";
import {
  KB_DOCUMENT_PROCESSING_STATUSES,
  KB_DOCUMENT_STATUS_LABELS,
  KbDocumentStatus,
  type KbDocument,
  type KbIngestEvent,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STAGE_LABELS: Record<string, string> = {
  Parse: "解析",
  Chunk: "切分",
  Embed: "向量化",
  Persist: "入库",
  Ocr: "OCR",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function isProcessing(status: KbDocumentStatus): boolean {
  return (KB_DOCUMENT_PROCESSING_STATUSES as readonly number[]).includes(status);
}

export function DocumentDetailDialog({
  kbId,
  docId,
  onOpenChange,
  onChanged,
}: {
  kbId: string;
  docId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [document, setDocument] = useState<KbDocument | null>(null);
  const [events, setEvents] = useState<KbIngestEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const [doc, evs] = await Promise.all([
        getDocument(kbId, docId),
        listDocumentEvents(kbId, docId),
      ]);
      setDocument(doc);
      setEvents(evs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载文档详情失败");
    } finally {
      setLoading(false);
    }
  }, [kbId, docId]);

  useEffect(() => {
    if (!docId) {
      setDocument(null);
      setEvents([]);
      return;
    }
    load();
  }, [docId, load]);

  // 处理中每 5s 轮询状态与事件；终态后停止
  const processing = document ? isProcessing(document.status) : false;
  useEffect(() => {
    if (!docId || !processing) return;
    const timer = setInterval(() => {
      Promise.all([getDocument(kbId, docId), listDocumentEvents(kbId, docId)])
        .then(([doc, evs]) => {
          setDocument(doc);
          setEvents(evs);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [docId, kbId, processing]);

  async function onRetry() {
    if (!docId) return;
    setRetrying(true);
    try {
      await retryDocument(kbId, docId);
      toast.success("已重新提交解析");
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "重试失败");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Dialog open={docId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            文档详情
            {document && (
              <Badge
                variant={
                  document.status === KbDocumentStatus.Ready
                    ? "default"
                    : document.status === KbDocumentStatus.Failed
                      ? "destructive"
                      : "secondary"
                }
              >
                {KB_DOCUMENT_STATUS_LABELS[document.status] ?? "未知"}
              </Badge>
            )}
          </DialogTitle>
          {document && (
            <DialogDescription>{document.originalFileName}</DialogDescription>
          )}
        </DialogHeader>

        {loading && !document ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
            <Loader2 className="size-4 animate-spin" /> 加载中…
          </div>
        ) : document ? (
          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">基本信息</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Item label="标题" value={document.title} />
                <Item label="大小" value={formatBytes(document.fileSizeBytes)} />
                <Item label="片段数" value={String(document.chunkCount)} />
                <Item
                  label="完成时间"
                  value={document.indexedAt ? formatTime(document.indexedAt) : "—"}
                />
                <Item label="创建时间" value={formatTime(document.createdAt)} />
                <Item label="文档 ID" value={document.id} />
              </dl>
              {document.errorMessage && (
                <p className="bg-destructive/10 text-destructive rounded px-2 py-1 text-xs">
                  失败原因：{document.errorMessage}
                </p>
              )}
              {document.status === KbDocumentStatus.Failed && (
                <Button size="sm" variant="outline" disabled={retrying} onClick={onRetry}>
                  {retrying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  重试（最多 3 次）
                </Button>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">处理流水</h3>
              <ol className="space-y-1">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 text-xs">
                    <Badge
                      variant={
                        ev.status === "failed"
                          ? "destructive"
                          : ev.status === "succeeded"
                            ? "default"
                            : "secondary"
                      }
                      className="w-16 justify-center"
                    >
                      {STAGE_LABELS[ev.stage] ?? ev.stage}
                    </Badge>
                    <span
                      className={
                        ev.status === "failed"
                          ? "text-destructive"
                          : ev.status === "running"
                            ? "text-primary"
                            : "text-muted-foreground"
                      }
                    >
                      {ev.message ?? ev.status}
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {formatTime(ev.createdAt)}
                    </span>
                  </li>
                ))}
                {events.length === 0 && (
                  <li className="text-muted-foreground text-xs">暂无流水记录</li>
                )}
              </ol>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}
