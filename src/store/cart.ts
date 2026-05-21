import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  title: string;
  thumbnail_url: string;
  quantity: number;
};

type CartState = {
  items: Record<string, CartItem>;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  toggle: (item: Omit<CartItem, "quantity">) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  totalQty: () => number;
  selectedIds: () => string[];
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items[item.id];
          return {
            items: {
              ...s.items,
              [item.id]: {
                ...item,
                quantity: (existing?.quantity ?? 0) + qty,
              },
            },
          };
        }),
      remove: (id) =>
        set((s) => {
          const next = { ...s.items };
          delete next[id];
          return { items: next };
        }),
      toggle: (item) =>
        set((s) => {
          const next = { ...s.items };
          if (next[item.id]) {
            delete next[item.id];
          } else {
            next[item.id] = { ...item, quantity: 1 };
          }
          return { items: next };
        }),
      setQty: (id, qty) =>
        set((s) => {
          if (!s.items[id]) return s;
          if (qty <= 0) {
            const next = { ...s.items };
            delete next[id];
            return { items: next };
          }
          return { items: { ...s.items, [id]: { ...s.items[id], quantity: qty } } };
        }),
      clear: () => set({ items: {} }),
      totalQty: () =>
        Object.values(get().items).reduce((a, b) => a + b.quantity, 0),
      selectedIds: () => Object.keys(get().items),
    }),
    { name: "realz-cart" }
  )
);
