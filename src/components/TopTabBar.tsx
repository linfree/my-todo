import { LayoutGrid, Calendar as CalendarIcon, ListTodo } from "lucide-react";
import { MainView } from "../types";
import { cn } from "../lib/utils";

interface TopTabBarProps {
  currentView: MainView;
  onViewChange: (view: MainView) => void;
}

const tabs = [
  { id: MainView.TASK, label: "任务", icon: ListTodo },
  { id: MainView.CALENDAR, label: "日历", icon: CalendarIcon },
  { id: MainView.BOARD, label: "看板", icon: LayoutGrid },
];

export function TopTabBar({ currentView, onViewChange }: TopTabBarProps) {
  return (
    <>
      {/* 桌面端 - 顶部居中显示 */}
      <div className="hidden md:flex items-center gap-1 px-1 bg-muted/50 rounded-xl p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 移动端 - 底部固定导航栏 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/50 safe-area-inset-bottom">
        <div className="flex items-center justify-around py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
