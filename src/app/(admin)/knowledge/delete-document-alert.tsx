"use client";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

/**
 * DeleteDocumentAlert — 删除文档二次确认弹窗。
 *
 * 受控组件：外部通过 open/onOpenChange 控制显示；确认后调用 onConfirm。
 */
export function DeleteDocumentAlert({
  open,
  onOpenChange,
  documentTitle,
  confirming,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  confirming?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            删除文档
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1">
              <p>
                确定删除文档{" "}
                <strong className="text-foreground">「{documentTitle}」</strong>{" "}
                吗？
              </p>
              <p className="text-destructive/80 text-xs">
                该文档的片段索引与原文件将一并删除，无法恢复。
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={confirming}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirming ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                删除中…
              </>
            ) : (
              "删除"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
