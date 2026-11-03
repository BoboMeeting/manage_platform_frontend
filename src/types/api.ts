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

// ==================== 视频资源 ====================

export const VideoProcessStatus = {
  /** 上传中 */
  Uploading: 0,
  /** 探测中（ffprobe） */
  Probing: 1,
  /** 转码中 */
  Transcoding: 2,
  /** 打包中 */
  Packaging: 3,
  /** 字幕处理中 */
  Subtitling: 4,
  /** 深意分析中（Agent 服务） */
  Analyzing: 5,
  /** 就绪 */
  Ready: 6,
  /** 失败（可重试） */
  Failed: 7,
} as const;
export type VideoProcessStatus =
  (typeof VideoProcessStatus)[keyof typeof VideoProcessStatus];

export const ShelfStatus = {
  OffShelf: 0,
  OnShelf: 1,
} as const;
export type ShelfStatus = (typeof ShelfStatus)[keyof typeof ShelfStatus];

export const SubtitleSource = {
  Uploaded: 0,
  Extracted: 1,
} as const;
export type SubtitleSource = (typeof SubtitleSource)[keyof typeof SubtitleSource];

export interface VideoResource {
  id: string;
  title: string;
  description: string | null;
  originalFileName: string;
  fileSizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  storageKey: string;
  hlsMasterKey: string | null;
  deepMeaningKey: string | null;
  processStatus: VideoProcessStatus;
  shelfStatus: ShelfStatus;
  failReason: string | null;
  failedStage: VideoProcessStatus | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubtitleTrack {
  id: string;
  videoResourceId: string;
  language: string;
  label: string | null;
  isDefault: boolean;
  source: SubtitleSource;
  storageKey: string;
  cueCount: number;
  originalFileName: string;
  createdAt: string;
}

export interface VideoStatusEvent {
  id: string;
  videoResourceId: string;
  stage: VideoProcessStatus;
  /** running / succeeded / failed */
  status: string;
  message: string | null;
  createdAt: string;
}

export interface VideoDetail {
  video: VideoResource;
  subtitles: SubtitleTrack[];
  events: VideoStatusEvent[];
}

export interface PlayUrlResponse {
  url: string;
  expiresInSeconds: number;
}

// ==================== 知识库（RAG） ====================

export const KbStatus = {
  Enabled: 0,
  Disabled: 1,
} as const;
export type KbStatus = (typeof KbStatus)[keyof typeof KbStatus];

export const KbDocumentStatus = {
  /** 已入队，等待解析 */
  Pending: 0,
  /** 解析中 */
  Parsing: 1,
  /** 切分 / embedding / 入库中 */
  Indexing: 2,
  /** 就绪，可被检索 */
  Ready: 3,
  /** 失败（可重试） */
  Failed: 4,
} as const;
export type KbDocumentStatus =
  (typeof KbDocumentStatus)[keyof typeof KbDocumentStatus];

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  embeddingModel: string;
  embeddingDim: number;
  chunkSize: number;
  chunkOverlap: number;
  status: KbStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** 列表项：实体 + 文档总数与各状态计数 */
export interface KnowledgeBaseListItem {
  knowledgeBase: KnowledgeBase;
  documentCount: number;
  readyCount: number;
  processingCount: number;
  failedCount: number;
}

export interface KbDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  originalFileName: string;
  contentType: string | null;
  fileSizeBytes: number;
  storageKey: string;
  checksum: string | null;
  status: KbDocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  indexedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KbIngestEvent {
  id: string;
  documentId: string;
  /** Parse / Chunk / Embed / Persist */
  stage: string;
  /** running / succeeded / failed */
  status: string;
  message: string | null;
  createdAt: string;
}

export interface KbSearchHit {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  headingPath: string | null;
  pageNo: number | null;
  content: string;
  /** 向量余弦相似度 */
  score: number;
  /** rerank 精排分数；未启用 rerank 或精排降级时为 null */
  rerankScore?: number | null;
  /** 召回路径：dense / hybrid（P4 起出现） */
  retrievalSource?: string;
}

export interface KnowledgeSearchResponse {
  query: string;
  elapsedMs: number;
  /** rerank 阶段耗时；未调用 rerank 时为 null */
  rerankElapsedMs?: number | null;
  hits: KbSearchHit[];
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

export const VIDEO_STATUS_LABELS: Record<number, string> = {
  [VideoProcessStatus.Uploading]: "上传中",
  [VideoProcessStatus.Probing]: "探测中",
  [VideoProcessStatus.Transcoding]: "转码中",
  [VideoProcessStatus.Packaging]: "打包中",
  [VideoProcessStatus.Subtitling]: "字幕处理",
  [VideoProcessStatus.Analyzing]: "深意分析",
  [VideoProcessStatus.Ready]: "就绪",
  [VideoProcessStatus.Failed]: "失败",
};

/** 处理中状态集合（列表页据此自动轮询） */
export const VIDEO_PROCESSING_STATUSES = [
  VideoProcessStatus.Uploading,
  VideoProcessStatus.Probing,
  VideoProcessStatus.Transcoding,
  VideoProcessStatus.Packaging,
  VideoProcessStatus.Subtitling,
  VideoProcessStatus.Analyzing,
] as const;

export const KB_STATUS_LABELS: Record<number, string> = {
  [KbStatus.Enabled]: "启用",
  [KbStatus.Disabled]: "停用",
};

export const KB_DOCUMENT_STATUS_LABELS: Record<number, string> = {
  [KbDocumentStatus.Pending]: "排队中",
  [KbDocumentStatus.Parsing]: "解析中",
  [KbDocumentStatus.Indexing]: "索引中",
  [KbDocumentStatus.Ready]: "就绪",
  [KbDocumentStatus.Failed]: "失败",
};

/** 处理中状态集合（详情页据此自动轮询） */
export const KB_DOCUMENT_PROCESSING_STATUSES: readonly KbDocumentStatus[] = [
  KbDocumentStatus.Pending,
  KbDocumentStatus.Parsing,
  KbDocumentStatus.Indexing,
];
