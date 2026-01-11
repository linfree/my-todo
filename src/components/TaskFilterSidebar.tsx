import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Sun,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  FolderOpen,
  Tag,
  X,
  Settings,
  Bell,
} from "lucide-react";
import { useTodoStore } from "../store/todoStore";
import { cn } from "../lib/utils";
import { getCategoryIcon, getRandomTagColor } from "../lib/icons";

interface TaskFilterSidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenSettings: () => void;
  onOpenNotificationSettings?: () => void;
}

export function TaskFilterSidebar({ className, isOpen = true, onClose, onOpenSettings, onOpenNotificationSettings }: TaskFilterSidebarProps) {
  const {
    categories,
    tags,
    currentCategoryId,
    currentTagId,
    currentListId,
    isTrashView,
    setCurrentCategory,
    setCurrentTag,
    setCurrentList,
    setIsTrashView,
    getCategoryTaskCount,
    getTagTaskCount,
    addCategory,
    deleteCategory,
    addTag,
    deleteTag,
    getDeletedTasks,
  } = useTodoStore();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["quick-access", "categories-section", "tags-section"])
  );

  const deletedTasksCount = getDeletedTasks().length;

  function getCategoryIconElement(iconName?: string) {
    const IconComponent = getCategoryIcon(iconName);
    return <IconComponent className="w-4 h-4" />;
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const isActive = (node: TreeNode) => {
    if (node.type === "filter") {
      if (node.filterType === "today") return currentListId === "today";
      if (node.filterType === "week") return currentListId === "week";
    }
    if (node.type === "category") return currentCategoryId === node.categoryId && currentListId === null;
    if (node.type === "tag") return currentTagId === node.tagId && currentListId === null;
    if (node.type === "trash") return isTrashView;
    return false;
  };

  const handleClick = (node: TreeNode) => {
    if (node.children) {
      toggleNode(node.id);
    } else if (node.action) {
      node.action();
    } else if (node.type === "filter") {
      if (node.filterType === "today") {
        // 今天视图 - 使用 listId
        setCurrentList("today");
      } else if (node.filterType === "week") {
        // 最近7天视图 - 使用 listId
        setCurrentList("week");
      }
    } else if (node.type === "category") {
      setCurrentCategory(node.categoryId!);
    } else if (node.type === "tag") {
      setCurrentTag(node.tagId!);
    } else if (node.type === "trash") {
      setIsTrashView(true);
    }
    // 移动端点击后关闭侧边栏
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  interface TreeNode {
    id: string;
    label: string;
    icon?: React.ReactNode;
    type: "filter" | "category" | "categories" | "tags" | "trash" | "tag" | "section-header";
    filterType?: "today" | "week";
    categoryId?: string;
    tagId?: string;
    count?: number;
    children?: TreeNode[];
    action?: () => void;
  }

  const treeData: TreeNode[] = [
    // 快速访问组（无标题）
    {
      id: "quick-access",
      label: "",
      type: "section-header",
      children: [
        {
          id: "today",
          label: "今天",
          type: "filter",
          filterType: "today",
          icon: <Sun className="w-4 h-4" />,
          count: 0,
        },
        {
          id: "week",
          label: "最近7天",
          type: "filter",
          filterType: "week",
          icon: <CalendarIcon className="w-4 h-4" />,
          count: 0,
        },
        {
          id: "inbox",
          label: "收集箱",
          type: "category",
          categoryId: "inbox",
          icon: getCategoryIconElement("Inbox"),
          count: getCategoryTaskCount("inbox"),
        },
      ],
    },
    // 分类组
    {
      id: "categories-section",
      label: "分类",
      type: "categories",
      icon: <FolderOpen className="w-4 h-4" />,
      children: categories.map((cat) => ({
        id: cat.id,
        label: cat.name,
        type: "category" as const,
        categoryId: cat.id,
        icon: getCategoryIconElement(cat.icon),
        count: getCategoryTaskCount(cat.id),
      })),
    },
    // 标签组
    {
      id: "tags-section",
      label: "标签",
      type: "tags",
      icon: <Tag className="w-4 h-4" />,
      children: tags.map((tag) => ({
        id: tag.id,
        label: tag.name,
        type: "tag" as const,
        tagId: tag.id,
        icon: <Tag className="w-4 h-4" style={{ color: tag.color }} />,
        count: getTagTaskCount(tag.id),
      })),
    },
    // 回收站单独
    {
      id: "trash",
      label: "回收站",
      type: "trash",
      icon: <Trash2 className="w-4 h-4" />,
      count: deletedTasksCount,
    },
  ];

  function handleAddCategory() {
    const name = prompt("请输入分类名称：");
    if (name && name.trim()) {
      addCategory({
        name: name.trim(),
        icon: "Folder",
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        order: categories.length,
      });
    }
  }

  function handleDeleteCategory(categoryId: string, categoryName: string) {
    if (confirm(`确定要删除分类"${categoryName}"吗？相关任务将移至收集箱。`)) {
      deleteCategory(categoryId);
    }
  }

  function handleAddTag() {
    const name = prompt("请输入标签名称：");
    if (name && name.trim()) {
      addTag({
        name: name.trim(),
        color: getRandomTagColor(),
      });
    }
  }

  function handleDeleteTag(tagId: string, tagName: string) {
    if (confirm(`确定要删除标签"${tagName}"吗？此操作将从所有任务中移除该标签。`)) {
      deleteTag(tagId);
    }
  }

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const active = isActive(node);
    const isSectionHeader = node.type === "section-header";
    const isExpandableHeader = node.type === "categories" || node.type === "tags";

    return (
      <div key={node.id}>
        {/* 分组标题 - 只在有标题时显示 */}
        {isSectionHeader && node.label && (
          <div className="mt-4 mb-1 px-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
            {node.label}
          </div>
        )}
        <div
          onClick={() => handleClick(node)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            isSectionHeader ? "hidden" : "cursor-pointer hover:bg-accent/80",
            isExpandableHeader ? "cursor-default font-semibold text-foreground/80" : "",
            active && !isExpandableHeader && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
            !active && !isExpandableHeader && "text-foreground/70 hover:text-foreground"
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {hasChildren && !isExpandableHeader && !isSectionHeader && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-current"
              type="button"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {(!hasChildren || isExpandableHeader || isSectionHeader) && <span className="w-5" />}
          {node.icon && <span className="flex-shrink-0 text-current">{node.icon}</span>}
          <span className="flex-1 text-left truncate">{node.label}</span>
          {node.count !== undefined && node.count > 0 && !isExpandableHeader && (
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {node.count}
            </span>
          )}
          {/* 分类部分的添加按钮 */}
          {node.id === "categories-section" && isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddCategory();
              }}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 text-current"
              title="添加分类"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {/* 标签部分的添加按钮 */}
          {node.id === "tags-section" && isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddTag();
              }}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 text-current"
              title="添加标签"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {/* 分类项的删除按钮 */}
          {node.type === "category" && node.categoryId && node.categoryId !== "inbox" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCategory(node.categoryId!, node.label);
              }}
              className="p-1 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-60 hover:opacity-100 text-current"
              title="删除分类"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {/* 标签项的删除按钮 */}
          {node.type === "tag" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTag(node.tagId!, node.label);
              }}
              className="p-1 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-60 hover:opacity-100 text-current"
              title="删除标签"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => (
              <div key={child.id} className="group">
                {renderNode(child, level + (isSectionHeader ? 0 : 1))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          "w-64 bg-card/80 backdrop-blur-sm border-r border-border flex flex-col",
          "md:relative fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        {/* 移动端关闭按钮 */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 树形导航 */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {treeData.map((node) => renderNode(node, 0))}
        </div>

        {/* 底部按钮 */}
        <div className="p-3 border-t border-border/60 space-y-1">
          <button
            onClick={() => {
              if (onOpenNotificationSettings) {
                onOpenNotificationSettings();
                if (onClose) onClose();
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          >
            <Bell className="w-4 h-4" />
            通知设置
          </button>
          <button
            onClick={() => {
              onOpenSettings();
              if (onClose) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            系统设置
          </button>
        </div>
      </aside>
    </>
  );
}
