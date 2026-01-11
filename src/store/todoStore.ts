import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Task, TaskList, Category, Priority, TaskStatus, ViewMode, Tag, MainView } from "../types";

interface TodoStore {
  // 状态
  tasks: Task[];
  lists: TaskList[];
  categories: Category[];
  tags: Tag[]; // 标签库
  currentListId: string | null;
  currentCategoryId: string | null;
  currentTagId: string | null; // 当前选中的标签ID
  isTrashView: boolean; // 是否在回收站视图
  viewMode: ViewMode;
  mainView: MainView; // 顶级视图模式（看板/日历/任务）
  selectedTaskId: string | null;
  searchQuery: string;
  filterPriority: Priority | "all";
  filterStatus: TaskStatus | "all";
  filterTags: string[];

  // 操作 - 任务
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void; // 软删除
  restoreTask: (id: string) => void; // 恢复任务
  permanentlyDeleteTask: (id: string) => void; // 永久删除
  toggleTaskComplete: (id: string) => void;
  reorderTasks: (tasks: Task[]) => void;

  // 操作 - 清单
  addList: (list: Omit<TaskList, "id" | "createdAt">) => void;
  updateList: (id: string, updates: Partial<TaskList>) => void;
  deleteList: (id: string) => void;

  // 操作 - 分类
  addCategory: (category: Omit<Category, "id" | "createdAt">) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // 操作 - 标签
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  getTagById: (id: string) => Tag | undefined;

  // 操作 - 视图
  setCurrentList: (id: string | null) => void;
  setCurrentCategory: (id: string | null) => void;
  setCurrentTag: (id: string | null) => void;
  setIsTrashView: (isTrash: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setMainView: (view: MainView) => void; // 设置顶级视图
  setSelectedTask: (id: string | null) => void;

  // 操作 - 筛选
  setSearchQuery: (query: string) => void;
  setFilterPriority: (priority: Priority | "all") => void;
  setFilterStatus: (status: TaskStatus | "all") => void;
  setFilterTags: (tags: string[]) => void;

  // 辅助方法
  getTasksByList: (listId: string) => Task[];
  getTasksByCategory: (categoryId: string) => Task[];
  getTasksByTag: (tagId: string) => Task[];
  getDeletedTasks: () => Task[];
  getFilteredTasks: () => Task[];
  getTaskCount: (listId: string) => number;
  getCategoryTaskCount: (categoryId: string) => number;
  getTagTaskCount: (tagId: string) => number;
  isToday: (date: Date) => boolean;
  isInNextWeek: (date: Date) => boolean;
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      tasks: [],
      lists: [
        { id: "all", name: "全部", icon: "Inbox", order: 0, createdAt: new Date() },
        { id: "today", name: "今天", icon: "Sun", order: 1, createdAt: new Date() },
        { id: "week", name: "最近7天", icon: "Calendar", order: 2, createdAt: new Date() },
      ],
      categories: [
        {
          id: "inbox",
          name: "收集箱",
          icon: "Inbox",
          color: "#6b7280",
          order: 0,
          createdAt: new Date(),
        },
        {
          id: "work",
          name: "工作",
          icon: "Briefcase",
          color: "#3b82f6",
          order: 1,
          createdAt: new Date(),
        },
        {
          id: "personal",
          name: "个人",
          icon: "User",
          color: "#10b981",
          order: 2,
          createdAt: new Date(),
        },
      ],
      tags: [
        { id: "work", name: "工作", color: "#3b82f6" },
        { id: "personal", name: "个人", color: "#10b981" },
        { id: "urgent", name: "紧急", color: "#ef4444" },
        { id: "study", name: "学习", color: "#8b5cf6" },
        { id: "health", name: "健康", color: "#f59e0b" },
      ],
      currentListId: null,
      currentCategoryId: "inbox", // 默认选择收集箱
      currentTagId: null,
      isTrashView: false,
      viewMode: ViewMode.LIST,
      mainView: MainView.TASK, // 默认显示任务视图
      selectedTaskId: null,
      searchQuery: "",
      filterPriority: "all",
      filterStatus: "all",
      filterTags: [],

      // 任务操作
      addTask: (taskData) => {
        const newTask: Task = {
          ...taskData,
          categoryId: taskData.categoryId || "inbox", // 默认属于收集箱
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, deleted: true, deletedAt: new Date(), updatedAt: new Date() }
              : task
          ),
        }));
      },

      restoreTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, deleted: false, deletedAt: undefined, updatedAt: new Date() }
              : task
          ),
        }));
      },

      permanentlyDeleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },

      toggleTaskComplete: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed: !task.completed,
                  updatedAt: new Date(),
                }
              : task
          ),
        }));
      },

      reorderTasks: (tasks) => {
        set({ tasks });
      },

      // 清单操作
      addList: (listData) => {
        const newList: TaskList = {
          ...listData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
        set((state) => ({ lists: [...state.lists, newList] }));
      },

      updateList: (id, updates) => {
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === id ? { ...list, ...updates } : list
          ),
        }));
      },

      deleteList: (id) => {
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== id),
          currentListId: state.currentListId === id ? null : state.currentListId,
        }));
      },

      // 分类操作
      addCategory: (categoryData) => {
        const newCategory: Category = {
          ...categoryData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          // 将属于该分类的任务移至收集箱
          tasks: state.tasks.map((task) =>
            task.categoryId === id ? { ...task, categoryId: "inbox", updatedAt: new Date() } : task
          ),
          currentCategoryId: state.currentCategoryId === id ? "inbox" : state.currentCategoryId,
        }));
      },

      // 标签操作
      addTag: (tagData) => {
        const newTag: Tag = {
          ...tagData,
          id: crypto.randomUUID(),
        };
        set((state) => {
          // 避免重复添加相同名称的标签
          if (state.tags.some((t) => t.name === tagData.name)) {
            return state;
          }
          return { tags: [...state.tags, newTag] };
        });
      },

      updateTag: (id, updates) => {
        set((state) => ({
          tags: state.tags.map((tag) =>
            tag.id === id ? { ...tag, ...updates } : tag
          ),
        }));
      },

      deleteTag: (id) => {
        set((state) => {
          const updatedTasks = state.tasks.map((task) => {
            const filteredTags = task.tags.filter((t) => t.id !== id);
            // 只有当标签被移除时才更新任务
            if (filteredTags.length !== task.tags.length) {
              return { ...task, tags: filteredTags, updatedAt: new Date() };
            }
            return task;
          });
          return {
            tags: state.tags.filter((tag) => tag.id !== id),
            tasks: updatedTasks,
          };
        });
      },

      getTagById: (id) => {
        const state = get();
        return state.tags.find((tag) => tag.id === id);
      },

      // 视图操作
      setCurrentList: (id) => set({ currentListId: id, currentCategoryId: null, currentTagId: null, isTrashView: false }),
      setCurrentCategory: (id) => set({ currentCategoryId: id, currentListId: null, currentTagId: null, isTrashView: false }),
      setCurrentTag: (id) => set({ currentTagId: id, currentCategoryId: null, currentListId: null, isTrashView: false }),
      setIsTrashView: (isTrash) => set({ isTrashView: isTrash, currentCategoryId: null, currentListId: null, currentTagId: null }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setMainView: (view) => set({ mainView: view }),
      setSelectedTask: (id) => set({ selectedTaskId: id }),

      // 筛选操作
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterPriority: (priority) => set({ filterPriority: priority }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setFilterTags: (tags) => set({ filterTags: tags }),

      // 辅助方法
      getTasksByList: (listId) => {
        const state = get();
        if (listId === "all") return state.tasks;
        if (listId === "today") {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          return state.tasks.filter(
            (task) => task.dueDate && new Date(task.dueDate) >= startOfDay && new Date(task.dueDate) <= endOfDay
          );
        }
        if (listId === "week") {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
          const weekLater = new Date(today);
          weekLater.setDate(weekLater.getDate() + 7);
          weekLater.setHours(23, 59, 59);
          return state.tasks.filter(
            (task) => task.dueDate && new Date(task.dueDate) >= startOfDay && new Date(task.dueDate) <= weekLater
          );
        }
        return state.tasks.filter((task) => task.listId === listId);
      },

      isToday: (date) => {
        const today = new Date();
        const compareDate = new Date(date);
        return (
          compareDate.getDate() === today.getDate() &&
          compareDate.getMonth() === today.getMonth() &&
          compareDate.getFullYear() === today.getFullYear()
        );
      },

      isInNextWeek: (date) => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        weekLater.setHours(23, 59, 59);
        const compareDate = new Date(date);
        return compareDate >= startOfDay && compareDate <= weekLater;
      },

      getTasksByCategory: (categoryId) => {
        const state = get();
        return state.tasks.filter((task) => task.categoryId === categoryId);
      },

      getTaskCount: (listId) => {
        const tasks = get().getTasksByList(listId);
        return tasks.filter((t) => !t.completed && !t.deleted).length;
      },

      getCategoryTaskCount: (categoryId) => {
        const tasks = get().getTasksByCategory(categoryId);
        return tasks.filter((t) => !t.completed && !t.deleted).length;
      },

      getTasksByTag: (tagId) => {
        const state = get();
        return state.tasks.filter((task) =>
          task.tags.some((t) => t.id === tagId) && !task.deleted
        );
      },

      getDeletedTasks: () => {
        const state = get();
        return state.tasks.filter((task) => task.deleted);
      },

      getTagTaskCount: (tagId) => {
        const tasks = get().getTasksByTag(tagId);
        return tasks.filter((t) => !t.completed).length;
      },

      getFilteredTasks: () => {
        const state = get();
        let tasks: Task[];

        // 回收站视图：显示已删除的任务
        if (state.isTrashView) {
          return state.getDeletedTasks();
        }

        // 标签视图
        if (state.currentTagId) {
          tasks = state.getTasksByTag(state.currentTagId);
        }
        // 分类视图
        else if (state.currentCategoryId) {
          tasks = state.getTasksByCategory(state.currentCategoryId);
        }
        // 清单视图
        else {
          tasks = state.getTasksByList(state.currentListId || "all");
        }

        // 过滤掉已删除的任务
        tasks = tasks.filter((task) => !task.deleted);

        // 搜索筛选
        if (state.searchQuery) {
          tasks = tasks.filter(
            (task) =>
              task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
              task.description?.toLowerCase().includes(state.searchQuery.toLowerCase())
          );
        }

        // 优先级筛选
        if (state.filterPriority !== "all") {
          tasks = tasks.filter((task) => task.priority === state.filterPriority);
        }

        // 状态筛选
        if (state.filterStatus !== "all") {
          tasks = tasks.filter((task) => task.status === state.filterStatus);
        }

        // 标签筛选
        if (state.filterTags.length > 0) {
          tasks = tasks.filter((task) =>
            state.filterTags.some((tagId) => task.tags.some((t) => t.id === tagId))
          );
        }

        return tasks;
      },
    }),
    {
      name: "todo-storage",
      version: 2,
      partialize: (state) => ({
        tasks: state.tasks,
        lists: state.lists,
        categories: state.categories,
        tags: state.tags,
      }),
      migrate: (persistedState: any, version: number) => {
        // Migrate from version 1 to version 2
        if (version === 1) {
          // Add default tags if not present
          if (!persistedState.tags) {
            persistedState.tags = [
              { id: "work", name: "工作", color: "#3b82f6" },
              { id: "personal", name: "个人", color: "#10b981" },
              { id: "urgent", name: "紧急", color: "#ef4444" },
              { id: "study", name: "学习", color: "#8b5cf6" },
              { id: "health", name: "健康", color: "#f59e0b" },
            ];
          }
        }
        return persistedState;
      },
    }
  )
);
