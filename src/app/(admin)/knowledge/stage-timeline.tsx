"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  KbDocumentStatus,
  KB_DOCUMENT_STATUS_LABELS,
} from "@/types/api";

/**
 * 4 阶段流水线常量（Parse → Chunk → Embed → Persist）。
 * 文档状态 → 阶段进度的推断规则见 inferStageProgress。
 */
const STAGES = ["Parse", "Chunk", "Embed", "Persist"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  Parse: "解析",
  Chunk: "切分",
  Embed: "向量化",
  Persist: "入库",
};

type StageState = "pending" | "active" | "done" | "failed";

/**
 * 根据文档状态推断各阶段的执行情况。
 * 后端列表接口不返回 events，只能从粗粒度 status 推断；
 * 详情弹窗中结合 events 可进一步精确，但本组件用于列表行，走状态推断路径。
 */
function inferStageProgress(status: KbDocumentStatus): Record<Stage, StageState> {
  const all: Record<Stage, StageState> = {
    Parse: "pending",
    Chunk: "pending",
    Embed: "pending",
    Persist: "pending",
  };
  switch (status) {
    case KbDocumentStatus.Pending:
      return all;
    case KbDocumentStatus.Parsing:
      all.Parse = "active";
      return all;
    case KbDocumentStatus.Indexing:
      // Indexing = Parse 完成，Chunk/Embed/Persist 整体进行中
      all.Parse = "done";
      all.Chunk = "active";
      all.Embed = "active";
      all.Persist = "active";
      return all;
    case KbDocumentStatus.Ready:
      all.Parse = "done";
      all.Chunk = "done";
      all.Embed = "done";
      all.Persist = "done";
      return all;
    case KbDocumentStatus.Failed:
      // 失败是笼统的，推断为 Parse 失败（详情弹窗会从 events 精确展示）
      all.Parse = "failed";
      return all;
    default:
      return all;
  }
}

function StageIcon({ state }: { state: StageState }) {
  const base = "size-4 shrink-0";
  switch (state) {
    case "done":
      return <CheckCircle2 className={cn(base, "text-emerald-500")} />;
    case "active":
      return <Loader2 className={cn(base, "text-primary animate-spin")} />;
    case "failed":
      return <XCircle className={cn(base, "text-destructive")} />;
    default:
      return <Circle className={cn(base, "text-muted-foreground/40")} />;
  }
}

/**
 * StageTimeline — 文档处理流水线可视化。
 *
 * 紧凑版（用于列表行）：仅显示图标 + 连接线，不显示文字标签。
 * 完整版（用于详情弹窗）：图标 + 文字标签 + 连接线。
 */
export function StageTimeline({
  status,
  variant = "compact",
  showStatusBadge = false,
  className,
}: {
  status: KbDocumentStatus;
  variant?: "compact" | "full";
  showStatusBadge?: boolean;
  className?: string;
}) {
  const progress = inferStageProgress(status);

  return (
    <div
      className={cn(
        "flex items-center gap-0",
        variant === "full" ? "gap-1" : "",
        className
      )}
    >
      {showStatusBadge && (
        <span className="text-xs text-muted-foreground mr-2">
          {KB_DOCUMENT_STATUS_LABELS[status] ?? "未知"}
        </span>
      )}
      {STAGES.map((stage, idx) => {
        const state = progress[stage];
        const isLast = idx === STAGES.length - 1;
        return (
          <div key={stage} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1",
                variant === "compact" ? "px-0.5" : ""
              )}
            >
              <StageIcon state={state} />
              {variant === "full" && (
                <span
                  className={cn(
                    "text-xs",
                    state === "done" && "text-emerald-600 dark:text-emerald-400",
                    state === "active" && "text-primary",
                    state === "failed" && "text-destructive",
                    state === "pending" && "text-muted-foreground/50"
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
              )}
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-px w-3 sm:w-4 mx-0.5",
                  state === "done"
                    ? "bg-emerald-500/60"
                    : state === "failed"
                      ? "bg-destructive/40"
                      : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
