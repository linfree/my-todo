import { useState } from "react";
import { Book, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

type ApiTab = "docs" | "database";

export function DeveloperSettings() {
  const [activeTab, setActiveTab] = useState<ApiTab>("docs");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">开发文档</h2>
          <p className="text-sm text-muted-foreground">API 接口说明与数据库结构参考</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button 
          variant={activeTab === "docs" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setActiveTab("docs")}
        >
          API 文档
        </Button>
        <Button 
          variant={activeTab === "database" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setActiveTab("database")}
        >
          数据库结构
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {activeTab === "docs" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  API 端点说明
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  如果使用自定义 API 同步服务，服务器需实现以下接口。
                </p>
                <div className="space-y-3">
                  <ApiEndpointDoc method="GET" endpoint="/api/tasks" description="获取所有任务" />
                  <ApiEndpointDoc method="POST" endpoint="/api/tasks" description="创建任务" />
                  <ApiEndpointDoc method="PUT" endpoint="/api/tasks/:id" description="更新任务" />
                  <ApiEndpointDoc method="DELETE" endpoint="/api/tasks/:id" description="删除任务" />
                  <ApiEndpointDoc method="GET" endpoint="/api/sync/download" description="增量同步下载" />
                  <ApiEndpointDoc method="POST" endpoint="/api/sync/upload" description="增量同步上传" />
                </div>
              </div>
            </div>
        )}

        {activeTab === "database" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <h3 className="font-medium mb-4">数据库表结构参考</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">tasks 表</h4>
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
);`}
                    onCopy={() => copyToClipboard("CREATE TABLE tasks...", "tasks-table")}
                    copied={copiedCode === "tasks-table"}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">lists 表</h4>
                  <CodeBlock 
                    code={`CREATE TABLE lists (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL
);`}
                    onCopy={() => copyToClipboard("CREATE TABLE lists...", "lists-table")}
                    copied={copiedCode === "lists-table"}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiEndpointDoc({ method, endpoint, description }: { method: string, endpoint: string, description: string }) {
  const methodColors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700 border-blue-200",
    POST: "bg-green-100 text-green-700 border-green-200",
    PUT: "bg-orange-100 text-orange-700 border-orange-200",
    DELETE: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-mono bg-background p-2 rounded border">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`border ${methodColors[method] || ""}`}>{method}</Badge>
        <span className="break-all">{endpoint}</span>
      </div>
      <span className="text-muted-foreground sm:ml-auto sans">{description}</span>
    </div>
  );
}

function CodeBlock({ code, onCopy, copied }: { code: string, onCopy: () => void, copied: boolean }) {
  return (
    <div className="relative group">
      <pre className="bg-background rounded p-3 text-xs overflow-x-auto border max-h-[300px]"><code>{code}</code></pre>
      <button 
        onClick={onCopy} 
        className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted transition-colors"
        title="复制代码"
      >
        {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
      </button>
    </div>
  );
}
