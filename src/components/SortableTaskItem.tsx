import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bell, Calendar, GripVertical, RotateCcw, Trash2 } from "lucide-react";
import { useTodoStore } from "../store/todoStore";
import { Task } from "../types";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { PRIORITY_COLORS } from "../lib/icons";

interface SortableTaskItemProps {
  task: Task;
  onClick: () => void;
  onReminderClick?: () => void;
  isTrashView?: boolean;
}

export function SortableTaskItem({ task, onClick, onReminderClick, isTrashView }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const { toggleTaskComplete, restoreTask, permanentlyDeleteTask } = useTodoStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleRestore(e: React.MouseEvent) {
    e.stopPropagation();
    restoreTask(task.id);
  }

  function handlePermanentDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm("确定要永久删除此任务吗？此操作无法撤销。")) {
      permanentlyDeleteTask(task.id);
    }
  }

  function handleToggleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    toggleTaskComplete(task.id);
  }

  function getPriorityLabel() {
    switch (task.priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return null;
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          "group flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer border border-transparent",
          isDragging ? "opacity-50" : "hover:bg-accent/50 hover:border-border/50"
        )}
        onClick={onClick}
      >
        {isTrashView ? (
          <>
            <button
              onClick={handleRestore}
              className="mt-1 p-1 sm:p-1.5 rounded-lg hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200 flex-shrink-0 text-current"
              title="恢复任务"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handlePermanentDelete}
              className="mt-1 p-1 sm:p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 flex-shrink-0 text-current"
              title="永久删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-40 hover:opacity-70 transition-opacity text-current"
              aria-label="拖动排序"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleComplete}
              className={cn(
                "mt-0.5 w-5 h-5 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
                task.completed
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30 hover:border-primary hover:scale-110 active:scale-95"
              )}
            >
              {task.completed && (
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </>
        )}

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium text-foreground transition-all duration-200",
              task.completed && !isTrashView && "text-muted-foreground line-through opacity-70"
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 sm:line-clamp-2">
              {task.description}
            </p>
          )}
          {(task.dueDate || task.tags.length > 0 || task.reminders.length > 0) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 text-current" />
                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {task.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs px-1.5 py-0 border-border/50">
                  {tag.name}
                </Badge>
              ))}
              {task.reminders.length > 0 && onReminderClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReminderClick();
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  title={`${task.reminders.length} 个提醒`}
                >
                  <Bell className="w-3 h-3" />
                  <span>{task.reminders.length}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {task.priority !== "none" && (
          <Badge
            variant="outline"
            className={cn("text-xs font-medium flex-shrink-0", PRIORITY_COLORS[task.priority])}
          >
            {getPriorityLabel()}
          </Badge>
        )}
      </div>
    </div>
  );
}
