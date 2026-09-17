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

export function extractErrorMessage(err: unknown, fallback = "An unexpected error occurred"): string {
  if (!err) return fallback;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
    if (typeof obj.error_description === "string" && obj.error_description.trim()) return obj.error_description;
    if (typeof obj.details === "string" && obj.details.trim()) return obj.details;
    if (typeof obj.hint === "string" && obj.hint.trim()) return `${obj.message || fallback} (${obj.hint})`;
  }
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}
