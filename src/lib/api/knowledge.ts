import { apiFetch, getToken } from "./client";
import type {
  KbDocument,
  KbIngestEvent,
  KnowledgeBase,
  KnowledgeBaseListItem,
  KnowledgeSearchResponse,
  PagedResult,
} from "@/types/api";

export interface KnowledgeBasePayload {
  name: string;
  description?: string | null;
  chunkSize?: number | null;
  chunkOverlap?: number | null;
}

export const MAX_KB_FILE_SIZE = 50 * 1024 * 1024; // 与后端上限一致
export const ALLOWED_KB_EXTENSIONS = [".txt", ".md", ".docx", ".pdf"] as const;

export function listKnowledgeBases() {
  return apiFetch<KnowledgeBaseListItem[]>("/api/admin/knowledge-bases/");
}

export function getKnowledgeBase(kbId: string) {
  return apiFetch<KnowledgeBase>(`/api/admin/knowledge-bases/${kbId}`);
}

export function createKnowledgeBase(payload: KnowledgeBasePayload) {
  return apiFetch<KnowledgeBase>("/api/admin/knowledge-bases/", {
    method: "POST",
    body: payload,
  });
}

export function updateKnowledgeBase(
  kbId: string,
  payload: Partial<KnowledgeBasePayload> & { enabled?: boolean }
) {
  return apiFetch<KnowledgeBase>(`/api/admin/knowledge-bases/${kbId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteKnowledgeBase(kbId: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/knowledge-bases/${kbId}`, {
    method: "DELETE",
  });
}

export function listDocuments(kbId: string, page = 1, pageSize = 20) {
  return apiFetch<PagedResult<KbDocument>>(
    `/api/admin/knowledge-bases/${kbId}/documents?page=${page}&pageSize=${pageSize}`
  );
}

export function getDocument(kbId: string, docId: string) {
  return apiFetch<KbDocument>(
    `/api/admin/knowledge-bases/${kbId}/documents/${docId}`
  );
}

export function listDocumentEvents(kbId: string, docId: string) {
  return apiFetch<KbIngestEvent[]>(
    `/api/admin/knowledge-bases/${kbId}/documents/${docId}/events`
  );
}

export function retryDocument(kbId: string, docId: string) {
  return apiFetch<{ ok: boolean; retryCount: number }>(
    `/api/admin/knowledge-bases/${kbId}/documents/${docId}/retry`,
    { method: "POST" }
  );
}

export function deleteDocument(kbId: string, docId: string) {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/knowledge-bases/${kbId}/documents/${docId}`,
    { method: "DELETE" }
  );
}

/** 检索调试（后端写 retrieval_logs，caller=admin-debug） */
export function searchKnowledge(kbId: string, query: string, topK?: number) {
  return apiFetch<KnowledgeSearchResponse>(
    `/api/admin/knowledge-bases/${kbId}/search`,
    { method: "POST", body: { query, topK } }
  );
}

/**
 * 上传文档（multipart，XMLHttpRequest 以获得上传进度）。
 * 后端返回 202，解析/切分/embedding/入库由后台 Worker 完成。
 */
export function uploadDocument(
  kbId: string,
  file: File,
  title?: string,
  onProgress?: (percent: number) => void
): Promise<KbDocument> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (title?.trim()) form.append("title", title.trim());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/knowledge-bases/${kbId}/documents`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        // 非 JSON 响应体
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as KbDocument);
      } else {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `上传失败（HTTP ${xhr.status}）`;
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("网络错误，上传中断"));
    xhr.send(form);
  });
}
