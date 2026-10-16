"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE,
  formatBytes,
  uploadVideo,
} from "@/lib/api/videos";
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
import { Textarea } from "@/components/ui/textarea";

/** 校验视频扩展名（.mp4/.mkv/.mov） */
function validateFile(file: File): string | null {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!(ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext))
    return `不支持的格式 ${ext}（允许 ${ALLOWED_VIDEO_EXTENSIONS.join("/")}）`;
  if (file.size > MAX_VIDEO_SIZE)
    return `文件超过上限（${formatBytes(MAX_VIDEO_SIZE)}）`;
  return null;
}

export function UploadVideoDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setProgress(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPickFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const problem = validateFile(f);
    if (problem) {
      setError(problem);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(f);
    // 标题缺省取文件名（去扩展名）
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function onSubmit() {
    if (!file) {
      setError("请选择视频文件");
      return;
    }
    if (!title.trim()) {
      setError("请填写标题");
      return;
    }
    setError(null);
    setProgress(0);
    try {
      await uploadVideo(
        file,
        { title: title.trim(), description: description.trim() || undefined },
        (p) => setProgress(p)
      );
      toast.success("上传成功，已进入处理流水线");
      reset();
      onOpenChange(false);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
      setProgress(null);
    }
  }

  const uploading = progress !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!uploading) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传视频</DialogTitle>
          <DialogDescription>
            支持 mp4 / mkv / mov，单文件不超过 {formatBytes(MAX_VIDEO_SIZE)}。
            上传完成后自动进入处理流水线（探测 → 转码 → 字幕 → 深意）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-file">视频文件</Label>
            <input
              ref={inputRef}
              id="video-file"
              type="file"
              accept=".mp4,.mkv,.mov,video/mp4,video/x-matroska,video/quicktime"
              disabled={uploading}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground hover:file:bg-primary/90"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-muted-foreground text-xs">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-title">标题</Label>
            <Input
              id="video-title"
              value={title}
              placeholder="如：大明王朝 EP01"
              disabled={uploading}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-desc">描述（可选）</Label>
            <Textarea
              id="video-desc"
              value={description}
              rows={2}
              disabled={uploading}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="bg-secondary h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                上传中 {progress}%{progress === 100 ? "，服务端处理中…" : ""}
              </p>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button onClick={onSubmit} disabled={uploading}>
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? "上传中…" : "开始上传"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
