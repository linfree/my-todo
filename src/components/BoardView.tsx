import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bell, MoreHorizontal, Plus, GripVertical } from "lucide-react";
import { useTodoStore } from "../store/todoStore";
import { Task, TaskStatus, Priority } from "../types";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { PRIORITY_COLORS } from "../lib/icons";

interface BoardViewProps {
  onTaskClick: (task: Task) => void;
}

const COLUMNS = [
  { id: TaskStatus.TODO, title: "待办", status: TaskStatus.TODO },
  { id: TaskStatus.IN_PROGRESS, title: "进行中", status: TaskStatus.IN_PROGRESS },
  { id: TaskStatus.DONE, title: "已完成", status: TaskStatus.DONE },
] as const;

export function BoardView({ onTaskClick }: BoardViewProps) {
  const { getFilteredTasks, updateTask } = useTodoStore();
  const tasks = getFilteredTasks();
  const [activeId, setActiveId] = useState<string | null>(null);

  // 按状态分组任务
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;

    // 查找被拖放到的列
    // over.id 可能是列ID（column-todo, column-inProgress等）或任务ID
    let targetStatus: TaskStatus | null = null;

    // 检查是否是列ID
    for (const column of COLUMNS) {
      if (over.id === `column-${column.id}`) {
        targetStatus = column.id;
        break;
      }
    }

    // 如果不是列ID，可能是任务ID，需要找到该任务所属的列
    if (targetStatus === null) {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    // 如果找到了目标状态，并且与当前状态不同，则更新
    if (targetStatus) {
      const currentTask = tasks.find(t => t.id === taskId);
      if (currentTask && currentTask.status !== targetStatus) {
        updateTask(taskId, { status: targetStatus });
      }
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* 移动端垂直堆叠，桌面端水平滚动 */}
      <div className="flex-1 overflow-y-auto md:overflow-x-auto md:overflow-y-hidden">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 h-full min-h-0 p-3 sm:p-6">
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.status);
            return (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                onTaskClick={onTaskClick}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="w-72 md:w-80 opacity-50">
            <TaskCard task={tasks.find((t) => t.id === activeId)!} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface BoardColumnProps {
  column: {
    id: TaskStatus;
    title: string;
    status: TaskStatus;
  };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function BoardColumn({ column, tasks, onTaskClick }: BoardColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const { addTask, currentCategoryId, currentListId } = useTodoStore();

  // 创建列的放置区域
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
  });

  const handleAddTask = () => {
    if (isAddingTask) {
      addTask({
        title: "新任务",
        completed: false,
        priority: Priority.NONE,
        status: column.status,
        listId: currentListId || "all",
        categoryId: currentCategoryId || undefined,
        tags: [],
        subTasks: [],
        reminders: [],
        order: 0,
      });
      setIsAddingTask(false);
    } else {
      setIsAddingTask(true);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-full md:w-80 flex flex-col bg-muted/40 rounded-xl border border-border/50"
    >
      {/* 列头 */}
      <div className="p-3 sm:p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm sm:text-base text-foreground">{column.title}</h3>
          <Badge variant="secondary" className="font-medium text-xs">{tasks.length}</Badge>
        </div>
      </div>

      {/* 任务列表 */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3 min-h-[150px] md:min-h-[200px]">
          {tasks.length === 0 && !isAddingTask ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground/70 text-xs sm:text-sm">
              拖放任务到这里
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* 添加任务按钮 */}
      <div className="p-2 sm:p-3 border-t border-border/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer text-sm sm:text-base"
          size="sm"
          onClick={handleAddTask}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isAddingTask ? "确认添加" : "添加任务"}
        </Button>
      </div>
    </div>
  );
}

interface SortableTaskCardProps {
  task: Task;
  onClick: () => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard
        task={task}
        onClick={onClick}
        isDragging={isDragging}
        dragHandleProps={{ ...listeners }}
      />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

function TaskCard({ task, onClick, isDragging, dragHandleProps }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { updateTask } = useTodoStore();

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200 border-border/50",
        isDragging && "opacity-50 rotate-2"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <button
            {...dragHandleProps}
            className="mt-1 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-70 transition-opacity flex-shrink-0 text-current"
            aria-label="拖动任务"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-medium text-sm line-clamp-2 text-foreground">{task.title}</h4>
              <div className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1 hover:bg-accent rounded-lg transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[100px] sm:min-w-[120px] z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTask(task.id, { status: TaskStatus.TODO });
                        setShowMenu(false);
                      }}
                      className="w-full px-2 sm:px-3 py-2 text-left text-xs sm:text-sm text-foreground hover:bg-accent cursor-pointer transition-colors"
                    >
                      移至待办
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTask(task.id, { status: TaskStatus.IN_PROGRESS });
                        setShowMenu(false);
                      }}
                      className="w-full px-2 sm:px-3 py-2 text-left text-xs sm:text-sm text-foreground hover:bg-accent cursor-pointer transition-colors"
                    >
                      移至进行中
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTask(task.id, { status: TaskStatus.DONE });
                        setShowMenu(false);
                      }}
                      className="w-full px-2 sm:px-3 py-2 text-left text-xs sm:text-sm text-foreground hover:bg-accent cursor-pointer transition-colors"
                    >
                      移至已完成
                    </button>
                  </div>
                )}
              </div>
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-3">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {task.priority !== "none" && (
                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", PRIORITY_COLORS[task.priority])}
                >
                  {task.priority === "high" && "高"}
                  {task.priority === "medium" && "中"}
                  {task.priority === "low" && "低"}
                </Badge>
              )}

              {task.subTasks.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-medium">
                    {task.subTasks.filter((st) => st.completed).length}/{task.subTasks.length}
                  </span>
                </div>
              )}

              {task.reminders.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Bell className="w-3 h-3" />
                  <span>{task.reminders.length}</span>
                </div>
              )}

              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-xs px-1.5 py-0 border-border/50"
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {task.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>

            {task.dueDate && (
              <div className="text-xs text-muted-foreground">
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
