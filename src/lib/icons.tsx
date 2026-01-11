import {
  Calendar as CalendarIcon,
  Sun,
  Briefcase,
  User,
  Inbox,
  type LucideIcon,
} from "lucide-react";

type IconMap = Record<string, LucideIcon>;

const iconMap: IconMap = {
  Inbox,
  Sun,
  Calendar: CalendarIcon,
  Briefcase,
  User,
};

export function getCategoryIcon(iconName?: string): LucideIcon {
  return iconMap[iconName || ""] || CalendarIcon;
}

export const PRIORITY_COLORS = {
  none: "",
  low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
} as const;

export const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

export function getRandomCategoryColor(): string {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}
