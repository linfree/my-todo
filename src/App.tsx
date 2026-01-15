import { useState } from "react";
import { Plus, Search, Moon, Sun, Menu, X } from "lucide-react";
import { useTodoStore } from "./store/todoStore";
import { Task, MainView } from "./types";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent } from "./components/ui/card";
import { TaskDetailDialog } from "./components/TaskDetailDialog";
import { BoardView } from "./components/BoardView";
import { CalendarView } from "./components/CalendarView";
import { SettingsDialog } from "./components/SettingsDialog";
import { TaskFilterSidebar } from "./components/TaskFilterSidebar";
import { TopTabBar } from "./components/TopTabBar";
import { SortableTaskItem } from "./components/SortableTaskItem";
import { AddTaskDialog } from "./components/AddTaskDialog";
import { cn } from "./lib/utils";
import "./index.css";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// 获取当前时间问候语
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了";
}

// App 主组件
function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("sync");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { getFilteredTasks, searchQuery, setSearchQuery, mainView, reorderTasks, isTrashView, setMainView } = useTodoStore();
  const filteredTasks = getFilteredTasks();

  const greeting = getGreeting();

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const handleDateClick = (_date: Date) => {
    // TODO: Implement date click handler for adding tasks to specific dates
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const oldIndex = filteredTasks.findIndex((t) => t.id === active.id);
    const newIndex = filteredTasks.findIndex((t) => t.id === over.id);

    if (oldIndex !== newIndex) {
      const newTasks = [...filteredTasks];
      const [removed] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, removed);

      newTasks.forEach((task, index) => {
        task.order = index;
      });

      reorderTasks(newTasks);
    }

    setActiveId(null);
  }

  return (
    <div className={cn("h-screen w-screen flex flex-col overflow-hidden", isDark && "dark")}>
      {/* 顶部 Tab 导航 */}
      <header className="flex-shrink-0 px-4 sm:px-6 py-4 bg-background border-b border-border/50">
        <div className="flex items-center justify-between">
          {/* 移动端 - 汉堡菜单按钮 */}
          {mainView === MainView.TASK && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden h-9 w-9 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          )}
          {/* TabBar - 响应式：桌面端居中，移动端显示在底部 */}
          <div className="hidden md:flex flex-1 justify-center">
            <TopTabBar currentView={mainView} onViewChange={setMainView} />
          </div>
          {/* 移动端占位 - TabBar 在底部渲染 */}
          <div className="md:hidden flex-1" />
          <div className="flex items-center gap-2 md:ml-auto">
            {/* 主题切换 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="h-9 w-9 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              title={isDark ? "切换到浅色模式" : "切换到深色模式"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {/* 移动端 - 底部 TabBar (固定定位，由 TopTabBar 组件处理) */}
        <div className="md:hidden">
          <TopTabBar currentView={mainView} onViewChange={setMainView} />
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
        {/* 侧边栏 - 只在任务视图下显示 */}
        {mainView === MainView.TASK && (
          <TaskFilterSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpenSettings={(tab) => {
              setSettingsTab(tab || "sync");
              setIsSettingsOpen(true);
            }}
          />
        )}

        {/* 内容区域 */}
        <main className="flex-1 flex flex-col bg-background overflow-hidden">
          {/* 欢迎区域 - 仅在任务视图显示 */}
          {mainView === MainView.TASK && (
            <>
              <div className="flex-shrink-0 px-6 sm:px-8 pt-6 pb-4">
                <div className="max-w-4xl">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-1 text-foreground">
                    {greeting}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    今天是 {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>

              {/* 搜索和操作栏 */}
              <div className="flex-shrink-0 px-6 sm:px-8 pb-4">
                <div className="max-w-4xl flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isTrashView ? "搜索已删除的任务..." : "搜索任务..."}
                      className="pl-10 h-10"
                    />
                  </div>
                  {!isTrashView && (
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Plus className="w-4 h-4 text-current" />
                      添加任务
                    </Button>
                  )}
                  {isTrashView && (
                    <div className="text-sm text-muted-foreground px-2">
                      {filteredTasks.length} 个已删除的任务
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 视图内容 */}
          <div className="flex-1 overflow-hidden">
            {/* 任务列表视图 */}
            {mainView === MainView.TASK && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="h-full overflow-y-auto px-6 sm:px-8 pb-8">
                  <div className="max-w-4xl">
                    {filteredTasks.length === 0 ? (
                      <Card className="border-dashed border-2 border-border/50">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                            <Plus className="w-8 h-8 text-muted-foreground/70" />
                          </div>
                          <h3 className="font-medium text-lg mb-1">还没有任务</h3>
                          <p className="text-muted-foreground text-sm">
                            点击"添加任务"按钮创建你的第一个任务
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <SortableContext
                        items={filteredTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {filteredTasks.map((task) => (
                            <SortableTaskItem
                              key={task.id}
                              task={task}
                              onClick={() => handleTaskClick(task)}
                              onReminderClick={() => handleTaskClick(task)}
                              isTrashView={isTrashView}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                </div>
                <DragOverlay>
                  {activeId ? (
                    <div className="w-full max-w-4xl mx-6 sm:mx-8 opacity-50">
                      <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
                        {filteredTasks.find((t) => t.id === activeId)?.title}
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* 看板视图 */}
            {mainView === MainView.BOARD && (
              <BoardView onTaskClick={handleTaskClick} />
            )}

            {/* 日历视图 */}
            {mainView === MainView.CALENDAR && (
              <CalendarView
                onTaskClick={handleTaskClick}
                onDateClick={handleDateClick}
              />
            )}
          </div>
        </main>
      </div>

      {/* 对话框 */}
      <AddTaskDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />

      <TaskDetailDialog
        task={selectedTask}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />
    </div>
  );
}

export default App;
