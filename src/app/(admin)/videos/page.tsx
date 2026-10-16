"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Film,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteVideo,
  formatBytes,
  formatDuration,
  listVideos,
  publishVideo,
  retryVideo,
  unpublishVideo,
} from "@/lib/api/videos";
import { ApiError } from "@/lib/api/client";
import {
  VIDEO_PROCESSING_STATUSES,
  VIDEO_STATUS_LABELS,
  type VideoProcessStatus,
  type VideoResource,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadVideoDialog } from "./upload-dialog";
import { VideoDetailDialog } from "./video-detail-dialog";

const STATUS_BADGE_VARIANT: Record<
  number,
  "default" | "secondary" | "destructive" | "outline"
> = {
  6: "default", // Ready
  7: "destructive", // Failed
};

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoResource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const pageSize = 20;

  const statusParam =
    statusFilter === "" ? null : (Number(statusFilter) as VideoProcessStatus);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listVideos({ keyword, status: statusParam, page, pageSize });
      setVideos(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载视频资源失败");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  // 存在处理中的资源时 5s 自动轮询（转码/深意为后台异步任务）
  const hasProcessing = videos.some((v) =>
    (VIDEO_PROCESSING_STATUSES as readonly number[]).includes(v.processStatus)
  );
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => {
      listVideos({ keyword, status: statusParam, page, pageSize })
        .then((res) => {
          setVideos(res.items);
          setTotal(res.total);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProcessing, keyword, statusFilter, page]);

  async function onToggleShelf(video: VideoResource) {
    try {
      if (video.shelfStatus === 1) {
        await unpublishVideo(video.id);
        toast.success("已下架");
      } else {
        await publishVideo(video.id);
        toast.success("已上架");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  async function onRetry(video: VideoResource) {
    try {
      await retryVideo(video.id);
      toast.success("已重新提交处理流水线");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "重试失败");
    }
  }

  async function onDelete(video: VideoResource) {
    if (!window.confirm(`确定删除视频「${video.title}」吗？关联文件与字幕将一并删除。`))
      return;
    try {
      await deleteVideo(video.id);
      toast.success("已删除");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const readyCount = videos.filter((v) => v.processStatus === 6).length;
  const failedCount = videos.filter((v) => v.processStatus === 7).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Film className="size-6" />
            视频资源
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            共 {total} 个资源 · 本页就绪 {readyCount} · 失败 {failedCount}
            {hasProcessing && " · 处理中（自动刷新）"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" />
            上传视频
          </Button>
        </div>
      </div>

      {/* 搜索与筛选 */}
      <div className="flex gap-2">
        <div className="relative w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={keyword}
            placeholder="搜索标题 / 文件名"
            className="pl-9"
            onChange={(e) => {
              setPage(1);
              setKeyword(e.target.value);
            }}
          />
        </div>
        <select
          className="border-input bg-background rounded-md border px-3 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">全部状态</option>
          {Object.entries(VIDEO_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          加载中…
        </div>
      ) : videos.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-16 text-center text-sm">
          暂无视频资源，点击「上传视频」开始
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>时长</TableHead>
                <TableHead>分辨率</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>上架</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-40 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <button
                      className="hover:text-primary hover:underline"
                      onClick={() => setDetailId(v.id)}
                      title="查看详情"
                    >
                      {v.title}
                    </button>
                    <div className="text-muted-foreground text-xs">
                      {v.originalFileName} · {formatBytes(v.fileSizeBytes)}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(v.durationMs)}</TableCell>
                  <TableCell>
                    {v.width ? `${v.width}×${v.height}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_BADGE_VARIANT[v.processStatus] ?? "secondary"}
                      title={v.failReason ?? undefined}
                    >
                      {VIDEO_STATUS_LABELS[v.processStatus] ?? "未知"}
                    </Badge>
                    {v.failReason && (
                      <div className="text-destructive mt-1 max-w-48 truncate text-xs" title={v.failReason}>
                        {v.failReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {v.processStatus === 6 ? (
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={v.shelfStatus === 1}
                          onChange={() => onToggleShelf(v)}
                        />
                        {v.shelfStatus === 1 ? "架上" : "下架"}
                      </label>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(v.createdAt).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {v.processStatus === 7 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onRetry(v)}
                          title="从失败阶段重试"
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                      {(v.processStatus === 6 || v.processStatus === 7) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(v)}
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

      {/* 分页 */}
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

      <UploadVideoDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={load}
      />
      <VideoDetailDialog
        videoId={detailId}
        onOpenChange={(o) => {
          if (!o) setDetailId(null);
        }}
        onChanged={load}
      />
    </div>
  );
}
