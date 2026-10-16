"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteSubtitle, getPlayUrl, getVideo, uploadSubtitle } from "@/lib/api/videos";
import { ApiError } from "@/lib/api/client";
import type { SubtitleTrack, VideoDetail } from "@/types/api";
import { VIDEO_STATUS_LABELS } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STAGE_LABELS: Record<number, string> = {
  0: "上传",
  1: "探测",
  2: "转码",
  3: "打包",
  4: "字幕",
  5: "深意",
  6: "就绪",
  7: "失败",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export function VideoDetailDialog({
  videoId,
  onOpenChange,
  onChanged,
}: {
  videoId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [subtitleLanguage, setSubtitleLanguage] = useState("zh-CN");
  const [subtitleDefault, setSubtitleDefault] = useState(true);
  const [uploadingSubtitle, setUploadingSubtitle] = useState(false);

  const load = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    try {
      setDetail(await getVideo(videoId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载详情失败");
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  // 处理中时 3s 轮询刷新流水
  useEffect(() => {
    if (!videoId) return;
    load();
    const timer = setInterval(() => {
      getVideo(videoId)
        .then(setDetail)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [videoId, load]);

  async function onUploadSubtitle() {
    if (!videoId || !subtitleFile) {
      toast.error("请选择字幕文件（srt/vtt/ass）");
      return;
    }
    setUploadingSubtitle(true);
    try {
      await uploadSubtitle(videoId, subtitleFile, {
        language: subtitleLanguage.trim() || "zh-CN",
        isDefault: subtitleDefault,
      });
      toast.success("字幕已上传并归一化为 VTT");
      setSubtitleFile(null);
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "字幕上传失败");
    } finally {
      setUploadingSubtitle(false);
    }
  }

  async function onDeleteSubtitle(track: SubtitleTrack) {
    if (!videoId) return;
    if (!window.confirm(`确定删除字幕轨「${track.label ?? track.language}」吗？`)) return;
    try {
      await deleteSubtitle(videoId, track.id);
      toast.success("已删除字幕轨");
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  async function onPreview() {
    if (!videoId) return;
    try {
      const { url } = await getPlayUrl(videoId);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "获取播放地址失败");
    }
  }

  return (
    <Dialog open={videoId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            视频详情
            {detail && (
              <Badge variant={detail.video.processStatus === 6 ? "default" : "secondary"}>
                {VIDEO_STATUS_LABELS[detail.video.processStatus] ?? "未知"}
              </Badge>
            )}
          </DialogTitle>
          {detail && (
            <DialogDescription>{detail.video.originalFileName}</DialogDescription>
          )}
        </DialogHeader>

        {loading && !detail ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
            <Loader2 className="size-4 animate-spin" /> 加载中…
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* 基本信息 */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">基本信息</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Item label="标题" value={detail.video.title} />
                <Item label="大小" value={`${(detail.video.fileSizeBytes / 1024 ** 2).toFixed(1)} MB`} />
                <Item
                  label="时长"
                  value={
                    detail.video.durationMs !== null
                      ? `${Math.floor(detail.video.durationMs! / 60000)}:${String(
                          Math.floor((detail.video.durationMs! % 60000) / 1000)
                        ).padStart(2, "0")}`
                      : "—"
                  }
                />
                <Item
                  label="分辨率"
                  value={detail.video.width ? `${detail.video.width}×${detail.video.height}` : "—"}
                />
                <Item
                  label="深意数据"
                  value={detail.video.deepMeaningKey ? "已生成" : "未生成"}
                />
                <Item label="创建时间" value={formatTime(detail.video.createdAt)} />
              </dl>
              {detail.video.failReason && (
                <p className="bg-destructive/10 text-destructive rounded px-2 py-1 text-xs">
                  失败原因：{detail.video.failReason}
                </p>
              )}
              {detail.video.processStatus === 6 && (
                <Button size="sm" variant="outline" onClick={onPreview}>
                  <Play className="size-4" />
                  预览播放
                </Button>
              )}
            </section>

            {/* 处理流水 */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">处理流水</h3>
              <ol className="space-y-1">
                {detail.events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 text-xs">
                    <Badge
                      variant={
                        ev.status === "failed"
                          ? "destructive"
                          : ev.status === "succeeded"
                            ? "default"
                            : "secondary"
                      }
                      className="w-14 justify-center"
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
                    <span className="text-muted-foreground ml-auto">{formatTime(ev.createdAt)}</span>
                  </li>
                ))}
                {detail.events.length === 0 && (
                  <li className="text-muted-foreground text-xs">暂无流水记录</li>
                )}
              </ol>
            </section>

            {/* 字幕轨管理 */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">字幕轨（{detail.subtitles.length}）</h3>
              {detail.subtitles.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>语言</TableHead>
                      <TableHead>文件</TableHead>
                      <TableHead>条目</TableHead>
                      <TableHead>默认</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.subtitles.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {t.label ?? t.language}
                          {t.isDefault && (
                            <Badge variant="outline" className="ml-2">
                              默认
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-xs">
                          {t.originalFileName}
                        </TableCell>
                        <TableCell>{t.cueCount}</TableCell>
                        <TableCell>{t.isDefault ? "✓" : "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDeleteSubtitle(t)}
                            title="删除字幕轨"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* 上传字幕 */}
              <div className="border-muted flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
                <div className="space-y-1">
                  <Label htmlFor="subtitle-file" className="text-xs">
                    字幕文件（srt/vtt/ass）
                  </Label>
                  <Input
                    id="subtitle-file"
                    type="file"
                    accept=".srt,.vtt,.ass,.ssa"
                    className="h-8 w-56 text-xs"
                    onChange={(e) => setSubtitleFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subtitle-lang" className="text-xs">
                    语言
                  </Label>
                  <Input
                    id="subtitle-lang"
                    value={subtitleLanguage}
                    className="h-8 w-24 text-xs"
                    onChange={(e) => setSubtitleLanguage(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={subtitleDefault}
                    onChange={(e) => setSubtitleDefault(e.target.checked)}
                  />
                  设为默认轨
                </label>
                <Button size="sm" disabled={uploadingSubtitle} onClick={onUploadSubtitle}>
                  {uploadingSubtitle ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  上传字幕
                </Button>
              </div>
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
      <dd className="truncate">{value}</dd>
    </div>
  );
}
