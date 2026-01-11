import { useState, useEffect } from "react";
import { Tag, Plus, Trash2, Bell } from "lucide-react";
import { useTodoStore } from "../store/todoStore";
import { Priority, TaskStatus, Task, SubTask, Reminder, Tag as TagType } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { DatePicker } from "./ui/date-picker";
import { cn } from "../lib/utils";
import { TAG_COLORS } from "../lib/icons";

interface TaskDetailDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailDialog({ task, isOpen, onClose }: TaskDetailDialogProps) {
  const { updateTask, categories, tags: storeTags, addTag } = useTodoStore();

  // 表单状态
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.NONE);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [listId, setListId] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // 初始化表单
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setListId(task.listId);
      setCategoryId(task.categoryId);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
      setSelectedTags(task.tags || []);
      setSubTasks(task.subTasks || []);
      setReminders(task.reminders || []);
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;

    updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status,
      listId,
      categoryId,
      dueDate: dueDate || undefined,
      tags: selectedTags,
      subTasks,
      reminders,
    });

    onClose();
  };

  const toggleTag = (tag: TagType) => {
    setSelectedTags((prev) =>
      prev.find((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    );
  };

  function handleAddTag() {
    if (!newTagName.trim()) return;

    const existingTag = storeTags.find((t) => t.name === newTagName.trim());
    if (existingTag) {
      if (!selectedTags.find((t) => t.id === existingTag.id)) {
        setSelectedTags((prev) => [...prev, existingTag]);
      }
    } else {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const newTag: TagType = {
        id: crypto.randomUUID(),
        name: newTagName.trim(),
        color,
      };
      addTag(newTag);
      setSelectedTags((prev) => [...prev, newTag]);
    }

    setNewTagName("");
    setIsAddingTag(false);
  }

  const addSubTask = () => {
    if (!newSubTaskTitle.trim()) return;

    const newSubTask: SubTask = {
      id: crypto.randomUUID(),
      title: newSubTaskTitle.trim(),
      completed: false,
    };

    setSubTasks([...subTasks, newSubTask]);
    setNewSubTaskTitle("");
  };

  const toggleSubTask = (id: string) => {
    setSubTasks(
      subTasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const deleteSubTask = (id: string) => {
    setSubTasks(subTasks.filter((st) => st.id !== id));
  };

  const addReminder = () => {
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      date: new Date(),
      repeat: "none",
      enabled: true,
    };
    setReminders([...reminders, newReminder]);
  };

  const updateReminder = (id: string, updates: Partial<Reminder>) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const priorityOptions = [
    { value: Priority.NONE, label: "无", color: "text-gray-500" },
    { value: Priority.LOW, label: "低", color: "text-blue-500" },
    { value: Priority.MEDIUM, label: "中", color: "text-yellow-500" },
    { value: Priority.HIGH, label: "高", color: "text-red-500" },
  ];

  const statusOptions = [
    { value: TaskStatus.TODO, label: "待办" },
    { value: TaskStatus.IN_PROGRESS, label: "进行中" },
    { value: TaskStatus.DONE, label: "已完成" },
  ];

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>任务详情</DialogTitle>
        </DialogHeader>

        <DialogClose onClick={onClose} />

        <div className="space-y-6">
          {/* 标题 */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="任务标题"
              className="text-lg font-medium"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="text-sm font-medium mb-2 block">描述</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述..."
              className="min-h-[100px]"
            />
          </div>

          {/* 优先级和状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">优先级</label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">状态</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* 分类 */}
          <div>
            <label className="text-sm font-medium mb-2 block">分类</label>
            <Select value={categoryId || "inbox"} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {/* 截止时间 */}
          <div>
            <label className="text-sm font-medium mb-2 block">截止时间</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="选择截止日期和时间"
              showSeconds={true}
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-current" />
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {storeTags.map((tag) => {
                const isSelected = selectedTags.find((t) => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-colors",
                      isSelected
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: tag.color }
                        : undefined
                    }
                  >
                    {tag.name}
                  </button>
                );
              })}
              <button
                onClick={() => setIsAddingTag(true)}
                className={cn(
                  "px-3 py-1 rounded-full text-sm transition-colors border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                <Plus className="w-3 h-3 inline mr-1" />
                添加
              </button>
            </div>
            {isAddingTag && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="输入标签名称..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleAddTag}
                  disabled={!newTagName.trim()}
                >
                  <Plus className="w-4 h-4 text-current" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsAddingTag(false);
                    setNewTagName("");
                  }}
                >
                  <Trash2 className="w-4 h-4 text-current" />
                </Button>
              </div>
            )}
          </div>

          {/* 子任务 */}
          <div>
            <label className="text-sm font-medium mb-2 block">子任务</label>
            <div className="space-y-2">
              {subTasks.map((subTask) => (
                <div
                  key={subTask.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <Checkbox
                    checked={subTask.completed}
                    onChange={() => toggleSubTask(subTask.id)}
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      subTask.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {subTask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSubTask(subTask.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  placeholder="添加子任务..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubTask();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={addSubTask}
                  disabled={!newSubTaskTitle.trim()}
                >
                  <Plus className="w-4 h-4 text-current" />
                </Button>
              </div>
            </div>
          </div>

          {/* 提醒 */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-current" />
              提醒
            </label>
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-2"
                >
                  <DatePicker
                    value={new Date(reminder.date)}
                    onChange={(date) =>
                      updateReminder(reminder.id, {
                        date: date || new Date(),
                      })
                    }
                    placeholder="选择提醒时间"
                    className="flex-1"
                    showSeconds={true}
                  />
                  <Select
                    value={reminder.repeat}
                    onChange={(e) =>
                      updateReminder(reminder.id, {
                        repeat: e.target.value as Reminder["repeat"],
                      })
                    }
                    className="w-32"
                  >
                    <option value="none">不重复</option>
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteReminder(reminder.id)}
                    className="h-10 w-10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={addReminder}
              >
                <Plus className="w-4 h-4 mr-2 text-current" />
                添加提醒
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
