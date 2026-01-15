import { invoke } from "@tauri-apps/api/core";
import { Task, TaskList } from "../types";

// 通知设置类型
export interface NotificationSettings {
  enabled: boolean;
  wechat_webhook?: string;
}

// 备份设置
export interface WebDavSettings {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  basePath: string;
  autoBackup: boolean;
  maxBackups?: number;
  simpleMode: boolean;
}

// 检查是否在 Tauri 环境中（更可靠的检测方法）
export const isTauri = () => {
  try {
    // 检查 __TAURI__ 内部属性（Tauri 2.0 使用 __TAURI_INTERNALS__）
    return !!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__;
  } catch {
    return false;
  }
};

// 数据库 API
export const databaseApi = {
  // 初始化数据库
  async initDatabase(): Promise<void> {
    if (!isTauri()) {
      console.log("Not in Tauri environment, skipping database init");
      return;
    }
    // 仅 SQLite，无需后端初始化命令
    return;
  },

  // 获取所有任务
  async getTasks(): Promise<Task[]> {
    if (!isTauri()) {
      // 在非 Tauri 环境（如 Web 开发）中，从 localStorage 读取
      const stored = localStorage.getItem("tasks");
      return stored ? JSON.parse(stored) : [];
    }

    const tasks = await invoke<any[]>("get_tasks");
    // 将后端返回的 JSON 字符串解析回数组
    return tasks.map((task: any) => ({
      ...task,
      tags: JSON.parse(task.tags || "[]"),
      subTasks: JSON.parse(task.subTasks || "[]"),
      reminders: JSON.parse(task.reminders || "[]"),
      // 将 ISO 字符串转换回 Date 对象
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    }));
  },

  // 保存任务
  async saveTask(task: Task): Promise<void> {
    if (!isTauri()) {
      // 在非 Tauri 环境中，保存到 localStorage
      const tasks = await this.getTasks();
      const index = tasks.findIndex((t) => t.id === task.id);
      if (index >= 0) {
        tasks[index] = task;
      } else {
        tasks.push(task);
      }
      localStorage.setItem("tasks", JSON.stringify(tasks));
      return;
    }

    // 将数组字段序列化为 JSON 字符串（后端期望字符串）
    const taskForBackend = {
      ...task,
      tags: JSON.stringify(task.tags),
      subTasks: JSON.stringify(task.subTasks),
      reminders: JSON.stringify(task.reminders),
      // 将 Date 对象转换为 ISO 字符串
      createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
      updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
      dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
    };

    console.log("[API] Saving task:", taskForBackend);
    try {
      await invoke("save_task", { task: taskForBackend });
      console.log("[API] Task saved successfully");
      // 保存任务后立即检查提醒
      await this.checkDueReminders();
    } catch (error) {
      console.error("[API] Failed to save task:", error);
      throw error;
    }
  },

  // 删除任务
  async deleteTask(id: string): Promise<void> {
    if (!isTauri()) {
      // 在非 Tauri 环境中，从 localStorage 删除
      const tasks = await this.getTasks();
      const filtered = tasks.filter((t) => t.id !== id);
      localStorage.setItem("tasks", JSON.stringify(filtered));
      return;
    }
    return invoke("delete_task", { id });
  },

  // 获取所有清单
  async getLists(): Promise<TaskList[]> {
    if (!isTauri()) {
      // 在非 Tauri 环境中，从 localStorage 读取
      const stored = localStorage.getItem("lists");
      return stored ? JSON.parse(stored) : [];
    }

    const lists = await invoke<any[]>("get_lists");
    // 将 ISO 字符串转换回 Date 对象
    return lists.map((list: any) => ({
      ...list,
      createdAt: new Date(list.createdAt),
    }));
  },

  // 检查并发送到期的提醒
  async checkDueReminders(): Promise<void> {
    if (!isTauri()) {
      // Web 端不执行提醒检查
      return;
    }
    return invoke("check_and_send_due_reminders");
  },
};

// 通知 API
export const notificationApi = {
  // 发送系统通知
  async sendNotification(title: string, body: string): Promise<void> {
    if (isTauri()) {
      // 桌面端使用 Tauri 通知
      return invoke("send_notification", { title, body });
    } else if ("Notification" in window) {
      // Web 端使用浏览器通知 API
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body });
          }
        });
      }
    }
  },

  // 发送企业微信机器人通知
  async sendWechatNotification(webhookUrl: string, title: string, content: string): Promise<void> {
    if (isTauri()) {
      return invoke("send_wechat_notification", {
        webhookUrl,
        title,
        content,
      });
    } else {
      // Web 端直接使用 fetch
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msgtype: "text",
          text: {
            content: `${title}\n\n${content}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send wechat notification: ${response.statusText}`);
      }
    }
  },

  // 获取需要提醒的任务
  async getDueReminders(): Promise<any[]> {
    if (isTauri()) {
      return invoke("get_due_reminders");
    }
    return [];
  },

  // 保存通知设置
  async saveSettings(settings: NotificationSettings): Promise<void> {
    if (isTauri()) {
      return invoke("save_notification_settings", { settings });
    } else {
      // Web 端保存到 localStorage
      localStorage.setItem("notification_settings", JSON.stringify(settings));
    }
  },

  // 加载通知设置
  async loadSettings(): Promise<NotificationSettings | null> {
    if (isTauri()) {
      return invoke("load_notification_settings");
    } else {
      // Web 端从 localStorage 读取
      const stored = localStorage.getItem("notification_settings");
      return stored ? JSON.parse(stored) : null;
    }
  },

  // 请求通知权限
  async requestPermission(): Promise<boolean> {
    if (isTauri()) {
      // Tauri 环境下，使用后端的权限检查
      return invoke("request_notification_permission");
    } else if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  },

  // 检查通知权限状态
  async checkPermission(): Promise<"granted" | "denied" | "default"> {
    if (isTauri()) {
      // Tauri 环境下，使用后端的权限检查
      const status = await invoke<string>("check_notification_permission");
      if (status === "granted") return "granted";
      if (status === "denied") return "denied";
      return "default";
    } else if ("Notification" in window) {
      return Notification.permission as "granted" | "denied" | "default";
    }
    return "default";
  },
};

// WebDAV/坚果云备份 API
export const webdavApi = {
  async saveSettings(settings: WebDavSettings): Promise<void> {
    if (isTauri()) {
      return invoke("save_webdav_settings", { settings });
    } else {
      localStorage.setItem("webdav_settings", JSON.stringify(settings));
    }
  },
  async loadSettings(): Promise<WebDavSettings | null> {
    if (isTauri()) {
      return invoke("load_webdav_settings");
    } else {
      const s = localStorage.getItem("webdav_settings");
      return s ? JSON.parse(s) : null;
    }
  },
  async testConnection(settings: WebDavSettings): Promise<void> {
    if (isTauri()) {
      return invoke("test_webdav_connection", { settings });
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }
  },
  async backup(): Promise<string> {
    if (isTauri()) {
      return invoke("backup_to_webdav");
    } else {
      return "web-backup-placeholder";
    }
  },
  async restore(filename: string): Promise<void> {
    if (isTauri()) {
      return invoke("restore_from_webdav", { filename });
    }
  },
};

// 导出类型供 Tauri 使用
declare global {
  interface Window {
    __TAURI__?: any;
  }
}
