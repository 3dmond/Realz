import type { OrderStatus } from "@/lib/admin-api";

/**
 * Standardizes Kenyan phone numbers and produces direct WhatsApp API URLs
 * Handles Kenyan mobile prefix formats: 07XX, 01XX, +2547XX, +2541XX, 25407XX, etc.
 */
export function toKenyanWhatsAppUrl(phone: string, message: string): string {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");

  if (clean.startsWith("0")) {
    clean = "254" + clean.slice(1);
  } else if (clean.startsWith("7") || clean.startsWith("1")) {
    clean = "254" + clean;
  } else if (clean.startsWith("2540")) {
    clean = "254" + clean.slice(4);
  }

  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/**
 * Formats a raw phone string into a readable Kenyan standard format (+254 7XX XXX XXX)
 */
export function formatKenyanPhone(phone: string): string {
  if (!phone) return "—";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "254" + clean.slice(1);
  } else if (clean.startsWith("7") || clean.startsWith("1")) {
    clean = "254" + clean;
  }
  if (clean.length === 12 && clean.startsWith("254")) {
    return `+254 ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }
  return phone;
}

export interface OrderStatusConfig {
  value: OrderStatus;
  label: string;
  operatorStage: string;
  badgeStyle: string;
  dotColor: string;
  nextStatus?: OrderStatus;
  nextActionLabel?: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pending: {
    value: "pending",
    label: "Needs Call",
    operatorStage: "Awaiting Verification",
    badgeStyle: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    dotColor: "bg-amber-400",
    nextStatus: "confirmed",
    nextActionLabel: "Confirm Order",
  },
  confirmed: {
    value: "confirmed",
    label: "Ready for Cut",
    operatorStage: "Queued for Vinyl Cutter",
    badgeStyle: "bg-blue-500/10 text-blue-400 border-blue-500/25",
    dotColor: "bg-blue-400",
    nextStatus: "processing",
    nextActionLabel: "Send to Cutter",
  },
  processing: {
    value: "processing",
    label: "In Batch Cut / Pack",
    operatorStage: "Plotter Cutting & Packing",
    badgeStyle: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25",
    dotColor: "bg-indigo-400",
    nextStatus: "out_for_delivery",
    nextActionLabel: "Ready for Rider",
  },
  out_for_delivery: {
    value: "out_for_delivery",
    label: "With Courier",
    operatorStage: "En Route to Customer",
    badgeStyle: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    dotColor: "bg-purple-400",
    nextStatus: "delivered",
    nextActionLabel: "Mark Delivered",
  },
  delivered: {
    value: "delivered",
    label: "Delivered & Settled",
    operatorStage: "Completed & Paid",
    badgeStyle: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    dotColor: "bg-emerald-400",
  },
  cancelled: {
    value: "cancelled",
    label: "Cancelled",
    operatorStage: "Declined / Cancelled",
    badgeStyle: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    dotColor: "bg-rose-400",
  },
  failed: {
    value: "failed",
    label: "Failed",
    operatorStage: "System / Payment Error",
    badgeStyle: "bg-red-500/10 text-red-400 border-red-500/25",
    dotColor: "bg-red-400",
  },
};
