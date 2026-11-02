"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createKnowledgeBase,
  updateKnowledgeBase,
  type KnowledgeBasePayload,
} from "@/lib/api/knowledge";
import type { KnowledgeBase } from "@/types/api";
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

export function KnowledgeBaseDialog({
  open,
  onOpenChange,
  kb,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入则为编辑，否则为新建 */
  kb: KnowledgeBase | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chunkSize, setChunkSize] = useState("500");
  const [chunkOverlap, setChunkOverlap] = useState("80");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(kb?.name ?? "");
    setDescription(kb?.description ?? "");
    setChunkSize(String(kb?.chunkSize ?? 500));
    setChunkOverlap(String(kb?.chunkOverlap ?? 80));
  }, [open, kb]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("知识库名称必填");
      return;
    }
    if (trimmedName.length > 128) {
      toast.error("名称长度不能超过 128 字符");
      return;
    }

    const size = Number(chunkSize);
    const overlap = Number(chunkOverlap);
    if (!Number.isInteger(size) || size <= 0) {
      toast.error("chunkSize 必须为正整数");
      return;
    }
    if (!Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
      toast.error("chunkOverlap 必须 ≥ 0 且小于 chunkSize");
      return;
    }

    const payload: KnowledgeBasePayload = {
      name: trimmedName,
      description: description.trim() || null,
      chunkSize: size,
      chunkOverlap: overlap,
    };

    setSubmitting(true);
    try {
      if (kb) {
        await updateKnowledgeBase(kb.id, payload);
        toast.success("知识库已更新（chunk 参数仅影响后续导入）");
      } else {
        await createKnowledgeBase(payload);
        toast.success("知识库已创建");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kb ? "编辑知识库" : "新建知识库"}</DialogTitle>
          <DialogDescription>
            知识库内的文档会按 chunk 切分并生成向量，供检索与 AI 参会者引用
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kb-name">名称</Label>
            <Input
              id="kb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：产品使用手册"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kb-desc">描述（可选）</Label>
            <Textarea
              id="kb-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话说明这个知识库收录什么内容"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="kb-chunk-size">chunkSize</Label>
              <Input
                id="kb-chunk-size"
                type="number"
                min={1}
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-chunk-overlap">chunkOverlap</Label>
              <Input
                id="kb-chunk-overlap"
                type="number"
                min={0}
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            切分参数只影响后续导入与重建，修改不会自动重建已有文档。
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
