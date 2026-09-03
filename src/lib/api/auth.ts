import { apiFetch } from "./client";
import type { AuthResponse, UserInfo } from "@/types/api";

export function login(account: string, password: string) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { account, password },
  });
}

export function me() {
  return apiFetch<UserInfo>("/api/auth/me");
}
