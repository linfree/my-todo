import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription
} from "./ui/dialog";
import { 
  Bell, 
  Database, 
  Settings as SettingsIcon,
  Code2
} from "lucide-react";
import { cn } from "../lib/utils";
import { NotificationSettings } from "./settings/NotificationSettings";
import { DataSettings } from "./settings/DataSettings";
import { DeveloperSettings } from "./settings/DeveloperSettings";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

type SettingsTab = "data" | "notification" | "developer";

export function SettingsDialog({ isOpen, onClose, initialTab = "data" }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("data");

  useEffect(() => {
    if (isOpen && initialTab) {
      if (initialTab === "sync" || initialTab === "backup" || initialTab === "storage") {
        setActiveTab("data");
      } else if (["data", "notification", "developer"].includes(initialTab)) {
        setActiveTab(initialTab as SettingsTab);
      } else {
        setActiveTab("data");
      }
    }
  }, [isOpen, initialTab]);

  const tabs = [
    { id: "data", label: "数据同步", icon: Database, component: DataSettings },
    { id: "notification", label: "通知提醒", icon: Bell, component: NotificationSettings },
    { id: "developer", label: "开发文档", icon: Code2, component: DeveloperSettings },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || DataSettings;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none md:max-w-4xl md:h-[80vh] flex flex-col md:flex-row p-0 overflow-hidden gap-0 border-0 md:border sm:rounded-none md:rounded-lg">
        <DialogTitle className="sr-only">设置中心</DialogTitle>
        <DialogDescription className="sr-only">应用设置与配置中心</DialogDescription>
        
        {/* Navigation Sidebar/Top Bar */}
        <div className="w-full md:w-64 bg-muted/30 border-b md:border-b-0 md:border-r flex flex-col flex-shrink-0">
          <div className="flex items-center gap-2 p-4 md:mb-2 text-foreground/80">
            <SettingsIcon className="w-5 h-5" />
            <span className="font-semibold">设置中心</span>
            {/* 移动端关闭按钮 */}
            <button 
              onClick={onClose}
              className="ml-auto md:hidden text-muted-foreground p-1"
            >
              <span className="sr-only">关闭</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          
          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 pb-2 md:pb-4 md:px-4 gap-1 md:space-y-1 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "flex items-center gap-2 md:gap-3 px-3 md:px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden bg-background relative">
           {/* 移动端内容区域需要滚动 */}
           <div className="h-full overflow-y-auto pr-1 md:pr-2 pb-10 md:pb-0">
              <ActiveComponent />
           </div>
           
           {/* 移动端底部关闭按钮 (可选，如果顶部已有关闭) */}
           {/* <div className="md:hidden absolute bottom-4 left-0 right-0 px-4 flex justify-center pointer-events-none">
             <Button onClick={onClose} variant="outline" className="pointer-events-auto shadow-lg bg-background/80 backdrop-blur">
               关闭设置
             </Button>
           </div> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
