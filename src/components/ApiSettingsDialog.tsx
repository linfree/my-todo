import { useState, useEffect } from "react";
import { Server, Database, Check, X, Loader2, Book, Copy, CheckCircle2 } from "lucide-react";
import { webApiService, syncManager } from "../lib/webapi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface ApiSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type StorageType = "local" | "remote";
type ApiTab = "config" | "docs" | "database";

export function ApiSettingsDialog({ isOpen, onClose }: ApiSettingsDialogProps) {
  const [storageType, setStorageType] = useState<StorageType>("local");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    lastSync: string | null;
    isConfigured: boolean;
  }>({ lastSync: null, isConfigured: false });
  const [activeTab, setActiveTab] = useState<ApiTab>("config");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 加载当前配置
  useEffect(() => {
    const config = webApiService.getConfig();
    if (config) {
      setStorageType("remote");
      setApiUrl(config.baseUrl);
      setApiKey(config.apiKey || "");
    } else {
      setStorageType("local");
    }

    setSyncStatus(syncManager.getStatus());
  }, [isOpen]);

  const handleTestConnection = async () => {
    if (!apiUrl) {
      setTestResult({ success: false, message: "请输入 API 地址" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      webApiService.configure({ baseUrl: apiUrl, apiKey });
      const result = await webApiService.testConnection();

      if (result.success) {
        setTestResult({ success: true, message: "连接成功！" });
      } else {
        setTestResult({ success: false, message: result.error || "连接失败" });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (storageType === "remote" && apiUrl) {
      webApiService.configure({ baseUrl: apiUrl, apiKey });
      syncManager.initialize();
    } else {
      webApiService.clearConfig();
      syncManager.stopAutoSync();
    }
    onClose();
  };

  const handleSyncNow = async () => {
    await syncManager.sync();
    setSyncStatus(syncManager.getStatus());
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            数据同步设置
          </DialogTitle>
        </DialogHeader>

        <DialogClose onClick={onClose} />

        {/* 标签页切换 */}
        {storageType === "remote" && (
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setActiveTab("config")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "config"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Server className="w-4 h-4 inline mr-2" />
              配置
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "docs"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Book className="w-4 h-4 inline mr-2" />
              API 文档
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "database"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Database className="w-4 h-4 inline mr-2" />
              数据库结构
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* 存储类型选择 */}
          <div>
            <label className="text-sm font-medium mb-3 block">数据存储方式</label>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={cn(
                  "cursor-pointer transition-colors",
                  storageType === "local"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => {
                  setStorageType("local");
                  setActiveTab("config");
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    本地存储
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  数据保存在本地设备（SQLite 或 localStorage），无需网络连接，更安全私密。
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-colors",
                  storageType === "remote"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => {
                  setStorageType("remote");
                  setActiveTab("config");
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    云端同步
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  数据同步到远程服务器，支持多设备协作和数据备份。
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 配置标签页 */}
          {storageType === "remote" && activeTab === "config" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">服务器配置</h3>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  API 地址
                </label>
                <Input
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  API 密钥（可选）
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入 API 密钥"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiUrl}
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Server className="w-4 h-4 mr-2" />
                  )}
                  测试连接
                </Button>

                {testResult && (
                  <Badge
                    variant={testResult.success ? "success" : "destructive"}
                    className="gap-1"
                  >
                    {testResult.success ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    {testResult.message}
                  </Badge>
                )}
              </div>

              {/* 同步状态 */}
              {syncStatus.isConfigured && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">同步状态</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {syncStatus.lastSync
                        ? `上次同步: ${new Date(syncStatus.lastSync).toLocaleString()}`
                        : "尚未同步"}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSyncNow}>
                      立即同步
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API 文档标签页 */}
          {storageType === "remote" && activeTab === "docs" && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  API 端点说明
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  服务器需要实现以下 RESTful API 端点来支持数据同步功能。
                </p>

                {/* 任务 API */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">任务管理</h5>

                  <ApiEndpointDoc
                    method="GET"
                    endpoint="/api/tasks"
                    description="获取所有任务"
                    params="?page=1&limit=20"
                    response={`{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}`}
                  />

                  <ApiEndpointDoc
                    method="GET"
                    endpoint="/api/tasks/:id"
                    description="获取单个任务"
                    response={`{
  "id": "uuid",
  "title": "任务标题",
  "description": "描述",
  "completed": false,
  "priority": "high",
  "status": "todo",
  ...
}`}
                  />

                  <ApiEndpointDoc
                    method="POST"
                    endpoint="/api/tasks"
                    description="创建任务"
                    request={`{
  "title": "新任务",
  "priority": "medium",
  "due_date": "2024-01-15T10:00:00Z"
}`}
                  />

                  <ApiEndpointDoc
                    method="PUT"
                    endpoint="/api/tasks/:id"
                    description="更新任务"
                  />

                  <ApiEndpointDoc
                    method="DELETE"
                    endpoint="/api/tasks/:id"
                    description="删除任务"
                  />

                  <ApiEndpointDoc
                    method="POST"
                    endpoint="/api/tasks/batch"
                    description="批量更新任务"
                    request={`{
  "updates": [
    { "id": "uuid1", "changes": { "status": "done" } },
    { "id": "uuid2", "changes": { "priority": "high" } }
  ]
}`}
                  />
                </div>

                {/* 清单 API */}
                <div className="space-y-3 mt-4">
                  <h5 className="text-sm font-medium">清单管理</h5>

                  <ApiEndpointDoc
                    method="GET"
                    endpoint="/api/lists"
                    description="获取所有清单"
                  />

                  <ApiEndpointDoc
                    method="POST"
                    endpoint="/api/lists"
                    description="创建清单"
                    request={`{
  "name": "工作",
  "icon": "Briefcase",
  "color": "#3b82f6"
}`}
                  />

                  <ApiEndpointDoc
                    method="PUT"
                    endpoint="/api/lists/:id"
                    description="更新清单"
                  />

                  <ApiEndpointDoc
                    method="DELETE"
                    endpoint="/api/lists/:id"
                    description="删除清单"
                  />
                </div>

                {/* 同步 API */}
                <div className="space-y-3 mt-4">
                  <h5 className="text-sm font-medium">数据同步</h5>

                  <ApiEndpointDoc
                    method="GET"
                    endpoint="/api/sync/download?since=2024-01-01T00:00:00Z"
                    description="下载远程更改（增量同步）"
                    response={`{
  "tasks": { "created": [], "updated": [], "deleted": [] },
  "lists": { "created": [], "updated": [], "deleted": [] },
  "last_sync": "2024-01-15T10:00:00Z"
}`}
                  />

                  <ApiEndpointDoc
                    method="POST"
                    endpoint="/api/sync/upload"
                    description="上传本地更改"
                    request={`{
  "tasks": { "created": [...], "updated": [...] },
  "lists": { "created": [], "updated": [] }
}`}
                  />
                </div>

                {/* 认证说明 */}
                <div className="mt-4 p-3 bg-background rounded border">
                  <h5 className="text-sm font-medium mb-2">认证方式</h5>
                  <p className="text-xs text-muted-foreground mb-2">
                    所有 API 请求需要在 Header 中包含认证信息：
                  </p>
                  <CodeBlock
                    code="Authorization: Bearer YOUR_API_KEY"
                    onCopy={() => copyToClipboard("Authorization: Bearer YOUR_API_KEY", "auth")}
                    copied={copiedCode === "auth"}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 数据库结构标签页 */}
          {storageType === "remote" && activeTab === "database" && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  数据库表结构
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  服务器端数据库需要创建以下表结构。
                </p>

                {/* tasks 表 */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium mb-2">tasks 表</h5>
                  <CodeBlock
                    code={`CREATE TABLE tasks (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'none',
  status VARCHAR(20) DEFAULT 'todo',
  list_id VARCHAR(36) NOT NULL,
  tags JSON DEFAULT '[]',
  sub_tasks JSON DEFAULT '[]',
  reminders JSON DEFAULT '[]',
  due_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);`}
                    onCopy={() => copyToClipboard(
                      "CREATE TABLE tasks...",
                      "tasks-table"
                    )}
                    copied={copiedCode === "tasks-table"}
                  />
                </div>

                {/* lists 表 */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium mb-2">lists 表</h5>
                  <CodeBlock
                    code={`CREATE TABLE lists (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL
);`}
                    onCopy={() => copyToClipboard(
                      "CREATE TABLE lists...",
                      "lists-table"
                    )}
                    copied={copiedCode === "lists-table"}
                  />
                </div>

                {/* sync_records 表 */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium mb-2">sync_records 表（用于同步）</h5>
                  <CodeBlock
                    code={`CREATE TABLE sync_records (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36),
  table_name VARCHAR(50),
  record_id VARCHAR(36),
  action VARCHAR(20),
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_records_user ON sync_records(user_id, created_at);`}
                    onCopy={() => copyToClipboard(
                      "CREATE TABLE sync_records...",
                      "sync-table"
                    )}
                    copied={copiedCode === "sync-table"}
                  />
                </div>

                {/* 数据库配置示例 */}
                <div className="mt-4 p-3 bg-background rounded border">
                  <h5 className="text-sm font-medium mb-2">数据库连接配置示例</h5>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">PostgreSQL:</p>
                      <CodeBlock
                        code="DATABASE_URL=postgresql://user:password@localhost:5432/tododb"
                        onCopy={() => copyToClipboard(
                          "postgresql://user:password@localhost:5432/tododb",
                          "pg-url"
                        )}
                        copied={copiedCode === "pg-url"}
                      />
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">MySQL:</p>
                      <CodeBlock
                        code="DATABASE_URL=mysql://user:password@localhost:3306/tododb"
                        onCopy={() => copyToClipboard(
                          "mysql://user:password@localhost:3306/tododb",
                          "mysql-url"
                        )}
                        copied={copiedCode === "mysql-url"}
                      />
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">SQLite:</p>
                      <CodeBlock
                        code="DATABASE_URL=file:./data/todo.db"
                        onCopy={() => copyToClipboard(
                          "file:./data/todo.db",
                          "sqlite-url"
                        )}
                        copied={copiedCode === "sqlite-url"}
                      />
                    </div>
                  </div>
                </div>

                {/* 支持的技术栈 */}
                <div className="mt-4 p-3 bg-background rounded border">
                  <h5 className="text-sm font-medium mb-2">推荐的服务器技术栈</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Node.js + Express + Prisma/TypeORM</li>
                    <li>• Python + FastAPI + SQLAlchemy</li>
                    <li>• Go + Gin + GORM</li>
                    <li>• Java + Spring Boot + JPA</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存设置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// API 端点文档组件
interface ApiEndpointDocProps {
  method: string;
  endpoint: string;
  description: string;
  params?: string;
  request?: string;
  response?: string;
}

function ApiEndpointDoc({
  method,
  endpoint,
  description,
  params,
  request,
  response
}: ApiEndpointDocProps) {
  const [copied, setCopied] = useState(false);

  const methodColors = {
    GET: "bg-green-500/10 text-green-600 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PUT: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  const color = methodColors[method as keyof typeof methodColors] || methodColors.GET;

  return (
    <div className="bg-background rounded-lg p-3 border">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className={cn("text-xs font-mono", color)}>
          {method}
        </Badge>
        <code className="text-sm font-mono">{endpoint}</code>
        {params && <span className="text-xs text-muted-foreground">{params}</span>}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>

      {(request || response) && (
        <div className="space-y-2">
          {request && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">请求体:</p>
              <CodeBlock
                code={request}
                onCopy={() => {
                  navigator.clipboard.writeText(request);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                copied={copied}
              />
            </div>
          )}
          {response && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">响应:</p>
              <CodeBlock
                code={response}
                onCopy={() => {
                  navigator.clipboard.writeText(response);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                copied={copied}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 代码块组件
interface CodeBlockProps {
  code: string;
  onCopy: () => void;
  copied: boolean;
}

function CodeBlock({ code, onCopy, copied }: CodeBlockProps) {
  return (
    <div className="relative group">
      <pre className="bg-background rounded p-2 text-xs overflow-x-auto border">
        <code>{code}</code>
      </pre>
      <button
        onClick={onCopy}
        className="absolute top-1 right-1 p-1 rounded bg-background border opacity-0 group-hover:opacity-100 transition-opacity"
        title="复制代码"
      >
        {copied ? (
          <CheckCircle2 className="w-3 h-3 text-green-500" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
