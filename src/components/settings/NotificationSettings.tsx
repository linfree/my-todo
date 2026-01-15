import { useState, useEffect } from "react";
import { Bell, Save, TestTube, Check, X, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { notificationApi, NotificationSettings as NotificationSettingsType, isTauri } from "../../lib/api";

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsType>({
    enabled: false,
    wechat_webhook: "",
  });
  const [permission, setPermission] = useState<"granted" | "denied" | "default">("default");
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(isTauri());
    loadSettings();
    checkPermission();
  }, []);

  const loadSettings = async () => {
    const saved = await notificationApi.loadSettings();
    if (saved) {
      setSettings(saved);
    }
  };

  const checkPermission = async () => {
    const perm = await notificationApi.checkPermission();
    setPermission(perm);
  };

  const requestPermission = async () => {
    const granted = await notificationApi.requestPermission();
    if (granted) {
      setPermission("granted");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await notificationApi.saveSettings(settings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setTestResult(null);
    try {
      await notificationApi.sendNotification("测试通知", "这是一条测试通知消息");

      if (isDesktop && settings.wechat_webhook) {
        await notificationApi.sendWechatNotification(
          settings.wechat_webhook,
          "测试通知",
          "这是一条测试通知消息"
        );
      }

      setTestResult("success");
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error("Test notification failed:", error);
      setTestResult("error");
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">通知提醒</h2>
          <p className="text-sm text-muted-foreground">管理系统通知与第三方推送</p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "保存中..." : "保存配置"}
        </Button>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
        {!isDesktop && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-amber-600 mb-1">Web 端功能限制</div>
              <div className="text-amber-700/80">
                Web 端仅支持浏览器通知。企业微信机器人通知需要使用桌面版应用。
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="font-medium">通知权限</div>
              <div className="text-sm text-muted-foreground">
                {permission === "granted" && "已授予通知权限"}
                {permission === "denied" && "通知权限已被拒绝"}
                {permission === "default" && "尚未授予通知权限"}
              </div>
            </div>
          </div>
          {permission !== "granted" && (
            <Button variant="outline" size="sm" onClick={requestPermission}>
              授予权限
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">启用通知</div>
            <div className="text-sm text-muted-foreground">
              开启后将按时发送任务提醒通知
            </div>
          </div>
          <Checkbox
            checked={settings.enabled}
            onChange={(e) =>
              setSettings({ ...settings, enabled: e.target.checked })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">企业微信机器人 Webhook</label>
            {!isDesktop && (
              <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                Web 端不可用
              </span>
            )}
          </div>
          <Input
            type="url"
            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
            value={settings.wechat_webhook || ""}
            onChange={(e) =>
              setSettings({ ...settings, wechat_webhook: e.target.value })
            }
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {isDesktop
              ? "配置后将在企业微信中接收任务提醒通知"
              : "企业微信通知仅在桌面版应用中可用"}
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-border/60">
          <div>
            <div className="font-medium">测试通知</div>
            <div className="text-sm text-muted-foreground">
              发送一条测试通知以验证配置
              {!isDesktop && "（仅浏览器通知）"}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            disabled={!settings.enabled}
          >
            <TestTube className="w-4 h-4 mr-2" />
            测试
          </Button>
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              testResult === "success"
                ? "bg-green-500/10 text-green-600"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {testResult === "success" ? (
              <>
                <Check className="w-4 h-4" />
                <span>测试通知已发送</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>测试通知发送失败</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
