import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCategoryTitle(title: string): string {
  if (!title) return "";
  if (title.startsWith("All ")) {
    return "All " + formatCategoryTitle(title.slice(4));
  }
  return title
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
