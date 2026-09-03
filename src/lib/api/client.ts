// 统一的 API 请求封装：
// - JWT 存 localStorage，请求自动带 Authorization: Bearer
// - 浏览器同源访问 /api/*，由 next.config.ts 的 rewrites 代理到后端（无需 CORS）
// - 401 自动清除 Token 并跳转登录页

const TOKEN_KEY = "bobomeet_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** 对象会自动 JSON.stringify；字符串则原样发送 */
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers as HeadersInit | undefined);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    body:
      options.body !== undefined && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : (options.body as BodyInit | undefined),
  });

  // 登录页自身的 401 由页面展示错误信息，不做跳转
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    clearToken();
    window.location.href = "/login";
    throw new ApiError(401, "登录已过期，请重新登录", null);
  }

  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`;
    let payload: unknown = null;
    try {
      payload = await res.json();
      if (payload && typeof payload === "object" && "error" in payload) {
        message = String((payload as { error: unknown }).error);
      }
    } catch {
      // 响应体非 JSON，使用默认消息
    }
    throw new ApiError(res.status, message, payload);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
