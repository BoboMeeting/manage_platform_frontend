"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  ALLOWED_KB_EXTENSIONS,
  MAX_KB_FILE_SIZE,
  uploadDocument,
} from "@/lib/api/knowledge";
import { formatBytes } from "@/lib/api/videos";
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

/** 校验扩展名与大小（与后端一致：txt/md/docx/pdf，≤50MB） */
function validateFile(file: File): string | null {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!(ALLOWED_KB_EXTENSIONS as readonly string[]).includes(ext))
    return `不支持的格式 ${ext}（允许 ${ALLOWED_KB_EXTENSIONS.join("/")}）`;
  if (file.size > MAX_KB_FILE_SIZE)
    return `文件超过上限（${formatBytes(MAX_KB_FILE_SIZE)}）`;
  return null;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  kbId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kbId: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setTitle("");
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
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function onSubmit() {
    if (!file) {
      setError("请选择文档文件");
      return;
    }
    setError(null);
    setProgress(0);
    try {
      await uploadDocument(kbId, file, title, (p) => setProgress(p));
      toast.success("已提交，正在后台解析与索引");
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
          <div className="space-y-2">
            <Label htmlFor="kb-file">文档文件</Label>
            <input
              ref={inputRef}
              id="kb-file"
              type="file"
              accept=".txt,.md,.docx,.pdf"
              disabled={uploading}
              className="text-muted-foreground file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-muted-foreground text-xs">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

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

          {uploading && (
            <div className="space-y-1">
              <div className="bg-secondary h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                上传中 {progress}%{progress === 100 ? "，等待入队…" : ""}
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
