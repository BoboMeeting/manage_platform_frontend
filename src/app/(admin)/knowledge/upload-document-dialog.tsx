"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  ALLOWED_KB_EXTENSIONS,
  MAX_KB_FILE_SIZE,
  uploadDocument,
} from "@/lib/api/knowledge";
import { formatBytes } from "@/lib/api/videos";
import { ApiError } from "@/lib/api/client";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** 校验扩展名与大小（与后端一致：txt/md/docx/pdf，≤50MB） */
function validateFile(file: File): string | null {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!(ALLOWED_KB_EXTENSIONS as readonly string[]).includes(ext))
    return `不支持的格式 ${ext}（允许 ${ALLOWED_KB_EXTENSIONS.join("/")}）`;
  if (file.size === 0) return "文件为空";
  if (file.size > MAX_KB_FILE_SIZE)
    return `文件超过上限（${formatBytes(MAX_KB_FILE_SIZE)}）`;
  return null;
}

/** 从 ApiError payload 中安全提取 existingDocumentId */
function extractExistingId(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "existingDocumentId" in payload) {
    const id = (payload as { existingDocumentId: unknown }).existingDocumentId;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  kbId,
  onUploaded,
  onViewExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kbId: string;
  onUploaded: () => void;
  /** 409 重复上传时，回调通知父组件打开已有文档详情 */
  onViewExisting?: (docId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [existingDocId, setExistingDocId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setTitle("");
    setProgress(null);
    setError(null);
    setDragOver(false);
    setExistingDocId(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  function onPickFile(f: File | null) {
    setError(null);
    setExistingDocId(null);
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
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPickFile(f);
  }

  async function onSubmit() {
    if (!file) {
      setError("请选择文档文件");
      return;
    }
    setError(null);
    setExistingDocId(null);
    setProgress(0);
    try {
      await uploadDocument(kbId, file, title, (p) => setProgress(p));
      toast.success("已提交，正在后台解析与索引");
      reset();
      onOpenChange(false);
      onUploaded();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // 重复上传：后端返回 existingDocumentId
        const id = extractExistingId(err.payload);
        setExistingDocId(id);
        setError("同内容文件已导入，不重复索引");
      } else {
        setError(err instanceof Error ? err.message : "上传失败");
      }
      setProgress(null);
    }
  }

  const uploading = progress !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!uploading) {
          if (!o) reset();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
          <DialogDescription>
            支持 txt / md / docx / pdf，单文件不超过 {formatBytes(MAX_KB_FILE_SIZE)}。
            上传后进入后台流水线（解析 → 切分 → embedding → 入库），状态可轮询查看。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={handleDrop}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.docx,.pdf"
              disabled={uploading}
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <FileUp
              className={cn(
                "mx-auto size-8",
                dragOver ? "text-primary" : "text-muted-foreground/60"
              )}
            />
            <p className="mt-2 text-sm font-medium">
              {dragOver ? "释放以上传" : "拖放文件到此处"}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              或 点击选择文件
            </p>
            {file && (
              <p className="text-primary mt-2 text-xs">
                已选：{file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          {/* Title input */}
          <div className="space-y-2">
            <Label htmlFor="kb-title">标题（可选）</Label>
            <Input
              id="kb-title"
              value={title}
              placeholder="缺省取文件名"
              disabled={uploading}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-muted-foreground text-xs text-center">
                上传中 {progress}%{progress === 100 ? "，等待入队…" : ""}
              </p>
            </div>
          )}

          {/* Error / Duplicate Conflict */}
          {error && (
            <div className="rounded-md p-3 text-sm bg-destructive/10 text-destructive">
              {error}
              {existingDocId && onViewExisting && (
                <button
                  type="button"
                  className="ml-2 underline underline-offset-2 hover:text-destructive/80 text-xs"
                  onClick={() => {
                    reset();
                    onOpenChange(false);
                    onViewExisting(existingDocId);
                  }}
                >
                  查看已有文档 →
                </button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button onClick={onSubmit} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                上传中…
              </>
            ) : (
              <>
                <Upload className="size-4" />
                开始上传
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
