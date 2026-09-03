import { apiFetch } from "./client";
import type { AiRole } from "@/types/api";

export interface AiRolePayload {
  name: string;
  description?: string | null;
  promptTemplate: string;
  ttsConfig?: string | null;
  avatarUrl?: string | null;
}

/** 列表走客户端公开接口 /api/ai-roles（管理端同样可读） */
export function listAiRoles() {
  return apiFetch<AiRole[]>("/api/ai-roles/");
}

export function createAiRole(payload: AiRolePayload) {
  return apiFetch<AiRole>("/api/admin/ai-roles/", {
    method: "POST",
    body: payload,
  });
}

export function updateAiRole(id: string, payload: AiRolePayload) {
  return apiFetch<AiRole>(`/api/admin/ai-roles/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAiRole(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/ai-roles/${id}`, { method: "DELETE" });
}
