import { apiFetch, getToken } from "./client";
import type {
  PlayUrlResponse,
  SubtitleTrack,
  VideoDetail,
  VideoProcessStatus,
  VideoResource,
} from "@/types/api";

export interface VideoListParams {
  keyword?: string;
  status?: VideoProcessStatus | null;
  page?: number;
  pageSize?: number;
}

export function listVideos(params: VideoListParams = {}) {
  const q = new URLSearchParams();
  if (params.keyword) q.set("keyword", params.keyword);
  if (params.status !== undefined && params.status !== null)
    q.set("status", String(params.status));
  q.set("page", String(params.page ?? 1));
  q.set("pageSize", String(params.pageSize ?? 20));
  return apiFetch<{ items: VideoResource[]; total: number; page: number; pageSize: number }>(
    `/api/admin/videos/?${q.toString()}`
  );
}

export function getVideo(id: string) {
  return apiFetch<VideoDetail>(`/api/admin/videos/${id}`);
}

export function deleteVideo(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/videos/${id}`, { method: "DELETE" });
}

export function publishVideo(id: string) {
  return apiFetch<VideoResource>(`/api/admin/videos/${id}/publish`, { method: "POST" });
}

export function unpublishVideo(id: string) {
  return apiFetch<VideoResource>(`/api/admin/videos/${id}/unpublish`, { method: "POST" });
}

export function retryVideo(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/videos/${id}/retry`, { method: "POST" });
}

export function getPlayUrl(id: string) {
  return apiFetch<PlayUrlResponse>(`/api/admin/videos/${id}/play-url`);
}

export function uploadSubtitle(
  id: string,
  file: File,
  options: { language?: string; label?: string; isDefault?: boolean } = {}
) {
  const form = new FormData();
  form.append("file", file);
  if (options.language) form.append("language", options.language);
  if (options.label) form.append("label", options.label);
  form.append("isDefault", String(options.isDefault ?? false));

  return apiFetch<SubtitleTrack>(`/api/admin/videos/${id}/subtitles`, {
    method: "POST",
    body: form,
  });
}

export function deleteSubtitle(id: string, trackId: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/videos/${id}/subtitles/${trackId}`, {
    method: "DELETE",
  });
}

export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 与后端 Kestrel 上限一致
export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mkv", ".mov"] as const;
export const ALLOWED_SUBTITLE_EXTENSIONS = [".srt", ".vtt", ".ass", ".ssa"] as const;

/**
 * 上传视频（multipart，XMLHttpRequest 以获得上传进度回调）。
 * onProgress 取值 0~100。
 */
export function uploadVideo(
  file: File,
  meta: { title?: string; description?: string },
  onProgress?: (percent: number) => void
): Promise<VideoResource> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (meta.title) form.append("title", meta.title);
    if (meta.description) form.append("description", meta.description);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/videos/");
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
        resolve(payload as VideoResource);
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

/** 时长毫秒 → m:ss / h:mm:ss */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** 字节数 → 可读大小 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
