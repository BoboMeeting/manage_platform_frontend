import { apiFetch } from "./client";
import type { PagedResult, UserInfo, UserRole, UserStatus, AccountKind } from "@/types/api";

export interface ListUsersParams {
  keyword?: string;
  status?: UserStatus;
  role?: UserRole;
}

export function listUsers(params: ListUsersParams = {}) {
  const q = new URLSearchParams();
  if (params.keyword) q.set("keyword", params.keyword);
  if (params.status !== undefined) q.set("status", String(params.status));
  if (params.role !== undefined) q.set("role", String(params.role));
  const qs = q.toString();
  return apiFetch<PagedResult<UserInfo>>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export interface CreateUserPayload {
  account: string;
  password: string;
  nickname?: string;
  accountKind?: AccountKind;
  role: UserRole;
}

export function createUser(payload: CreateUserPayload) {
  return apiFetch<UserInfo>("/api/admin/users/create", {
    method: "POST",
    body: payload,
  });
}

export interface UpdateUserPayload {
  nickname?: string;
  role?: UserRole;
  status?: UserStatus;
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return apiFetch<UserInfo>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function resetPassword(id: string, newPassword: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/users/${id}/reset-password`, {
    method: "POST",
    body: { newPassword },
  });
}

export function disableUser(id: string) {
  return apiFetch<UserInfo>(`/api/admin/users/${id}/disable`, { method: "POST" });
}

export function enableUser(id: string) {
  return apiFetch<UserInfo>(`/api/admin/users/${id}/enable`, { method: "POST" });
}
