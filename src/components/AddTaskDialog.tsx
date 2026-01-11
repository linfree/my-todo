import { useState } from "react";
import { useTodoStore } from "../store/todoStore";
import { Priority, TaskStatus } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTaskDialog({ isOpen, onClose }: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const { addTask, currentListId, currentCategoryId } = useTodoStore();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      completed: false,
      priority: Priority.NONE,
      status: TaskStatus.TODO,
      listId: currentListId || "all",
      categoryId: currentCategoryId || undefined,
      tags: [],
      subTasks: [],
      reminders: [],
      order: 0,
    });
    setTitle("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg shadow-xl border-border/50">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="准备做什么？"
              className="text-base"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button type="button" variant="ghost" onClick={onClose} className="cursor-pointer">
              取消
            </Button>
            <Button type="submit">添加</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
