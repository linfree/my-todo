import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTodoStore } from "../store/todoStore";
import { Task } from "../types";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"] as const;

interface CalendarViewProps {
  onTaskClick: (task: Task) => void;
  onDateClick?: (date: Date) => void;
}

export function CalendarView({ onTaskClick, onDateClick: _onDateClick }: CalendarViewProps) {
  const { getFilteredTasks } = useTodoStore();
  const tasks = getFilteredTasks();
  const [currentDate, setCurrentDate] = useState(new Date());

  // 获取当前月份的信息
  const { daysInMonth, firstDayOfMonth, currentMonth, currentYear } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return {
      daysInMonth: days,
      firstDayOfMonth: firstDay,
      currentMonth: month,
      currentYear: year,
    };
  }, [currentDate]);

  // 获取某日期的任务
  const getTasksForDate = (day: number) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === currentYear
      );
    });
  };

  // 上个月
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // 下个月
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // 回到今天
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 生成日历格子
  const calendarDays = [];
  // 填充月初空白
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-24 sm:h-28 bg-muted/20" />);
  }
  // 填充日期
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(
      <CalendarDay
        key={day}
        day={day}
        tasks={getTasksForDate(day)}
        isToday={
          new Date().getDate() === day &&
          new Date().getMonth() === currentMonth &&
          new Date().getFullYear() === currentYear
        }
        onTaskClick={onTaskClick}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            {currentYear}年{currentMonth + 1}月
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday} className="cursor-pointer">
            今天
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="cursor-pointer">
            <ChevronLeft className="w-4 h-4 text-current" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="cursor-pointer">
            <ChevronRight className="w-4 h-4 text-current" />
          </Button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-px bg-border/50 border border-border/50 rounded-t-xl overflow-hidden">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-muted/40 p-2 text-center text-sm font-medium text-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-px bg-border/50 border-x border-border/50 flex-1 overflow-y-auto">
        {calendarDays}
      </div>

      {/* 底部边框 */}
      <div className="h-px bg-border border-b border-border/50 rounded-b-xl" />
    </div>
  );
}

interface CalendarDayProps {
  day: number;
  tasks: Task[];
  isToday: boolean;
  onTaskClick: (task: Task) => void;
}

function CalendarDay({ day, tasks, isToday, onTaskClick }: CalendarDayProps) {
  const maxTasksToShow = 3;
  const displayTasks = tasks.slice(0, maxTasksToShow);
  const remainingCount = tasks.length - maxTasksToShow;

  const priorityColors = {
    none: "bg-muted",
    low: "bg-blue-500",
    medium: "bg-amber-500",
    high: "bg-red-500",
  };

  return (
    <div
      className={cn(
        "h-24 sm:h-28 bg-card p-1.5 hover:bg-accent/30 transition-colors cursor-pointer",
        isToday && "bg-primary/5 ring-inset ring-2 ring-primary/20"
      )}
    >
      <div
        className={cn(
          "text-sm font-medium text-foreground mb-1.5 w-7 h-7 flex items-center justify-center rounded-lg mx-auto",
          isToday && "bg-primary text-primary-foreground shadow-sm"
        )}
      >
        {day}
      </div>
      <div className="space-y-1">
        {displayTasks.map((task) => (
          <div
            key={task.id}
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick(task);
            }}
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-md truncate text-white shadow-sm",
              priorityColors[task.priority],
              task.completed && "opacity-50 line-through"
            )}
          >
            {task.title}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-muted-foreground/70 px-1.5">
            +{remainingCount} 更多
          </div>
        )}
      </div>
    </div>
  );
}
