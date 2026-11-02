"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { searchKnowledge } from "@/lib/api/knowledge";
import type { KnowledgeSearchResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
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

export function SearchDebugDialog({
  open,
  onOpenChange,
  kbId,
  kbName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kbId: string;
  kbName: string;
}) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("3");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<KnowledgeSearchResponse | null>(null);

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      toast.error("请输入检索内容");
      return;
    }
    const k = Number(topK);
    setSearching(true);
    try {
      setResult(
        await searchKnowledge(kbId, q, Number.isFinite(k) && k > 0 ? k : undefined)
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "检索失败");
    } finally {
      setSearching(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setResult(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-4" />
            检索调试
          </DialogTitle>
          <DialogDescription>
            在「{kbName}」内执行检索，结果与 AI 参会者调用时一致（记录为 admin-debug）
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSearch} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="kb-query">检索内容</Label>
            <Input
              id="kb-query"
              value={query}
              placeholder="例如：如何预约会议"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="w-24 space-y-2">
            <Label htmlFor="kb-topk">topK</Label>
            <Input
              id="kb-topk"
              type="number"
              min={1}
              max={5}
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
            />
          </div>
        </form>

        {result && (
          <div className="space-y-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              命中 {result.hits.length} 段 · 耗时 {result.elapsedMs}ms
            </div>
            {result.hits.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border py-8 text-center text-sm">
                未命中，可尝试更换表述或确认文档已就绪
              </div>
            ) : (
              <ol className="space-y-2">
                {result.hits.map((hit, index) => (
                  <li key={hit.chunkId} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{hit.documentTitle}</span>
                      {hit.headingPath && (
                        <span className="text-muted-foreground truncate">
                          {hit.headingPath}
                        </span>
                      )}
                      {hit.pageNo !== null && (
                        <span className="text-muted-foreground">第 {hit.pageNo} 页</span>
                      )}
                      <span className="text-muted-foreground ml-auto">
                        相似度 {hit.score.toFixed(4)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 line-clamp-4 text-xs whitespace-pre-wrap">
                      {hit.content}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={() => onSearch()} disabled={searching}>
            {searching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            检索
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
