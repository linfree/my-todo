// 任务优先级
export enum Priority {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

// 任务状态
export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
}

// 标签
export interface Tag {
  id: string;
  name: string;
  color: string;
}

// 子任务
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

// 提醒设置
export interface Reminder {
  id: string;
  date: Date;
  repeat?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  enabled: boolean;
}

// 任务
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  status: TaskStatus;
  listId: string;
  categoryId?: string; // 所属分类
  tags: Tag[];
  subTasks: SubTask[];
  reminders: Reminder[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  order: number;
  deleted?: boolean; // 是否已删除（软删除）
  deletedAt?: Date; // 删除时间
}

// 清单
export interface TaskList {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: Date;
}

// 分类
export interface Category {
  id: string;
  name: string;
  icon?: string;
  color: string;
  order: number;
  createdAt: Date;
}

// 顶级视图模式（顶部 Tab）
export enum MainView {
  BOARD = "board",
  CALENDAR = "calendar",
  TASK = "task",
}

// 任务过滤器类型（任务 Tab 下的子过滤器）
export enum TaskFilter {
  TODAY = "today",
  WEEK = "week",
  INBOX = "inbox",
  CATEGORY = "category",
  TAG = "tag",
  TRASH = "trash",
}

// 旧版本兼容（保留用于其他可能的扩展）
export enum ViewMode {
  LIST = "list",
  BOARD = "board",
  TIMELINE = "timeline",
  CALENDAR = "calendar",
}

// 日历视图类型
export enum CalendarView {
  MONTH = "month",
  WEEK = "week",
  DAY = "day",
}

// 侧边栏节点类型
export type SidebarNodeType = "view" | "list" | "category";

// 侧边栏节点
export interface SidebarNode {
  id: string;
  type: SidebarNodeType;
  label: string;
  icon?: string;
  children?: SidebarNode[];
  expanded?: boolean;
}

// 视图节点数据
export interface ViewNode extends SidebarNode {
  type: "view";
  viewMode: ViewMode;
}

// 清单节点数据
export interface ListNode extends SidebarNode {
  type: "list";
  listId: string;
}

// 分类节点数据
export interface CategoryNode extends SidebarNode {
  type: "category";
  categoryId: string;
}
