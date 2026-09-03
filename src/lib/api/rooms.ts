import { apiFetch } from "./client";
import type { MeetingRoom, MeetingRoomStatus } from "@/types/api";

export function listRooms(status?: MeetingRoomStatus) {
  const qs = status !== undefined ? `?status=${status}` : "";
  return apiFetch<MeetingRoom[]>(`/api/admin/rooms${qs}`);
}

/** 取消会议（后端将状态置为 Cancelled） */
export function cancelRoom(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/rooms/${id}`, { method: "DELETE" });
}
