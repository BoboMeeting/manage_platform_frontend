// 与后端 C# 枚举 / DTO 对齐。
// 注意：后端 System.Text.Json 默认将枚举序列化为数字。

export const UserRole = {
  /** 普通用户（参会者/主持人） */
  User: 0,
  /** 观察员：只读管理后台 */
  Observer: 1,
  /** 运营：用户/会议/AI 角色管理 */
  Operator: 2,
  /** 超级管理员：全部权限，含权限管理 */
  SuperAdmin: 3,
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  Active: 0,
  Disabled: 1,
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const AccountKind = {
  Email: 0,
  Phone: 1,
} as const;
export type AccountKind = (typeof AccountKind)[keyof typeof AccountKind];

export const MeetingRoomStatus = {
  /** 已预约（未到开放时间） */
  Scheduled: 0,
  /** 开放中（在预约时间窗口内，允许入会） */
  Open: 1,
  /** 已关闭（预约时间窗口已结束） */
  Closed: 2,
  /** 已取消 */
  Cancelled: 3,
} as const;
export type MeetingRoomStatus = (typeof MeetingRoomStatus)[keyof typeof MeetingRoomStatus];

// ==================== DTO ====================

export interface UserInfo {
  id: string;
  account: string;
  nickname: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: UserInfo;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MeetingRoom {
  id: string;
  title: string;
  roomName: string;
  hostUserId: string;
  hostNickname: string;
  startTime: string;
  durationSeconds: number;
  endTime: string;
  maxParticipants: number;
  status: MeetingRoomStatus;
  locked: boolean;
  inviteCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiRole {
  id: string;
  name: string;
  description: string | null;
  promptTemplate: string;
  ttsConfig: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 展示标签 ====================

export const USER_ROLE_LABELS: Record<number, string> = {
  [UserRole.User]: "普通用户",
  [UserRole.Observer]: "观察员",
  [UserRole.Operator]: "运营",
  [UserRole.SuperAdmin]: "超级管理员",
};

export const USER_STATUS_LABELS: Record<number, string> = {
  [UserStatus.Active]: "启用",
  [UserStatus.Disabled]: "禁用",
};

export const ROOM_STATUS_LABELS: Record<number, string> = {
  [MeetingRoomStatus.Scheduled]: "已预约",
  [MeetingRoomStatus.Open]: "开放中",
  [MeetingRoomStatus.Closed]: "已关闭",
  [MeetingRoomStatus.Cancelled]: "已取消",
};
