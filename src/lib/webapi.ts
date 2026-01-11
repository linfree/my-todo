import { Task, TaskList } from "../types";

// API 配置
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
}

// API 响应
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class WebApiService {
  private config: ApiConfig | null = null;

  // 初始化配置
  configure(config: ApiConfig) {
    this.config = config;
  }

  // 获取配置
  getConfig(): ApiConfig | null {
    return this.config;
  }

  // 清除配置
  clearConfig() {
    this.config = null;
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    if (!this.config) {
      return {
        success: false,
        error: "API not configured. Please configure the API first.",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Request failed",
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // ========== 任务 API ==========

  // 获取所有任务
  async getTasks(params?: PaginationParams): Promise<ApiResponse<Task[]>> {
    const query = params ? `?page=${params.page}&limit=${params.limit}` : "";
    return this.request<Task[]>(`/api/tasks${query}`);
  }

  // 获取单个任务
  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api/tasks/${id}`);
  }

  // 创建任务
  async createTask(task: Partial<Task>): Promise<ApiResponse<Task>> {
    return this.request<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
  }

  // 更新任务
  async updateTask(id: string, task: Partial<Task>): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(task),
    });
  }

  // 删除任务
  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/tasks/${id}`, {
      method: "DELETE",
    });
  }

  // 批量操作
  async batchUpdateTasks(
    updates: Array<{ id: string; changes: Partial<Task> }>
  ): Promise<ApiResponse<Task[]>> {
    return this.request<Task[]>("/api/tasks/batch", {
      method: "POST",
      body: JSON.stringify({ updates }),
    });
  }

  // ========== 清单 API ==========

  // 获取所有清单
  async getLists(): Promise<ApiResponse<TaskList[]>> {
    return this.request<TaskList[]>("/api/lists");
  }

  // 获取单个清单
  async getList(id: string): Promise<ApiResponse<TaskList>> {
    return this.request<TaskList>(`/api/lists/${id}`);
  }

  // 创建清单
  async createList(list: Partial<TaskList>): Promise<ApiResponse<TaskList>> {
    return this.request<TaskList>("/api/lists", {
      method: "POST",
      body: JSON.stringify(list),
    });
  }

  // 更新清单
  async updateList(id: string, list: Partial<TaskList>): Promise<ApiResponse<TaskList>> {
    return this.request<TaskList>(`/api/lists/${id}`, {
      method: "PUT",
      body: JSON.stringify(list),
    });
  }

  // 删除清单
  async deleteList(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/lists/${id}`, {
      method: "DELETE",
    });
  }

  // ========== 同步 API ==========

  // 获取本地更改
  async getLocalChanges(): Promise<ApiResponse<any>> {
    return this.request<any>("/api/sync/changes");
  }

  // 上传本地更改
  async uploadChanges(changes: any): Promise<ApiResponse<any>> {
    return this.request<any>("/api/sync/upload", {
      method: "POST",
      body: JSON.stringify(changes),
    });
  }

  // 下载远程更改
  async downloadChanges(lastSync: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/sync/download?since=${lastSync}`);
  }

  // ========== 用户配置 API ==========

  // 获取用户配置
  async getUserConfig(): Promise<ApiResponse<any>> {
    return this.request<any>("/api/user/config");
  }

  // 更新用户配置
  async updateUserConfig(config: any): Promise<ApiResponse<any>> {
    return this.request<any>("/api/user/config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  }

  // 测试连接
  async testConnection(): Promise<ApiResponse<{ connected: boolean }>> {
    return this.request<{ connected: boolean }>("/api/health", {
      method: "HEAD",
    });
  }
}

// 导出单例
export const webApiService = new WebApiService();

// 同步管理器
export class SyncManager {
  private lastSync: string | null = null;
  private syncInterval: number | null = null;

  // 初始化同步
  async initialize() {
    // 从 localStorage 读取上次同步时间
    const stored = localStorage.getItem("lastSync");
    if (stored) {
      this.lastSync = stored;
    }

    // 自动同步（每5分钟）
    this.startAutoSync(5 * 60 * 1000);
  }

  // 启动自动同步
  startAutoSync(interval: number) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      this.sync();
    }, interval);
  }

  // 停止自动同步
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // 手动同步
  async sync() {
    if (!webApiService.getConfig()) {
      console.log("API not configured, skipping sync");
      return;
    }

    try {
      // 下载远程更改
      const response = await webApiService.downloadChanges(
        this.lastSync || new Date(0).toISOString()
      );

      if (response.success && response.data) {
        // 应用远程更改到本地
        // 这里需要根据实际的数据结构来处理
        console.log("Downloaded changes:", response.data);
      }

      // 上传本地更改
      // 这里需要收集本地未同步的更改并上传

      // 更新同步时间
      this.lastSync = new Date().toISOString();
      localStorage.setItem("lastSync", this.lastSync);
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  // 获取同步状态
  getStatus(): {
    lastSync: string | null;
    isConfigured: boolean;
  } {
    return {
      lastSync: this.lastSync,
      isConfigured: webApiService.getConfig() !== null,
    };
  }
}

export const syncManager = new SyncManager();
