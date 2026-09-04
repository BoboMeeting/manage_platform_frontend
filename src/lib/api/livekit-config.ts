import { apiFetch } from "./client";
import type { LiveKitConfig } from "@/types/api";

export interface LiveKitConfigPayload {
  url: string;
  apiKey: string;
  /** 新的 ApiSecret。为空字符串时后端将保留原值（若已有记录）。 */
  apiSecret: string;
}

/** 管理端获取 LiveKit 配置（SuperAdmin 权限）。 */
export function getLiveKitConfig() {
  return apiFetch<LiveKitConfig>("/api/admin/livekit-config");
}

/** 管理端保存 LiveKit 配置（SuperAdmin 权限）。 */
export function saveLiveKitConfig(payload: LiveKitConfigPayload) {
  return apiFetch<LiveKitConfig>("/api/admin/livekit-config", {
    method: "PUT",
    body: payload,
  });
}
