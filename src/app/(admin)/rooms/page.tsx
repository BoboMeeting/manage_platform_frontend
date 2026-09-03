"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { cancelRoom, listRooms } from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import {
  ROOM_STATUS_LABELS,
  MeetingRoomStatus,
  type MeetingRoom,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SELECT_CLASS =
  "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const STATUS_BADGE_CLASS: Record<number, string> = {
  [MeetingRoomStatus.Scheduled]: "bg-blue-600 hover:bg-blue-600",
  [MeetingRoomStatus.Open]: "bg-emerald-600 hover:bg-emerald-600",
  [MeetingRoomStatus.Closed]: "bg-zinc-500 hover:bg-zinc-500",
  [MeetingRoomStatus.Cancelled]: "bg-red-600 hover:bg-red-600",
};

export default function RoomsPage() {
  const [status, setStatus] = useState("");
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listRooms(
        status === "" ? undefined : (Number(status) as MeetingRoomStatus)
      );
      setRooms(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载会议列表失败");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCancel(room: MeetingRoom) {
    if (!window.confirm(`确定取消会议「${room.title}」吗？`)) return;
    try {
      await cancelRoom(room.id);
      toast.success("会议已取消");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">会议管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            共 {rooms.length} 场会议
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <select
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value={MeetingRoomStatus.Scheduled}>已预约</option>
          <option value={MeetingRoomStatus.Open}>开放中</option>
          <option value={MeetingRoomStatus.Closed}>已关闭</option>
          <option value={MeetingRoomStatus.Cancelled}>已取消</option>
        </select>
      </div>

      <div className="rounded-lg border">
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            加载中…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>会议主题</TableHead>
                <TableHead>房间号</TableHead>
                <TableHead>主持人</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center"
                  >
                    暂无会议数据
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="font-mono">{r.roomName}</TableCell>
                    <TableCell>{r.hostNickname || "-"}</TableCell>
                    <TableCell>{formatDateTime(r.startTime)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE_CLASS[r.status] ?? ""}>
                        {ROOM_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status !== MeetingRoomStatus.Cancelled &&
                        r.status !== MeetingRoomStatus.Closed && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onCancel(r)}
                          >
                            取消会议
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
