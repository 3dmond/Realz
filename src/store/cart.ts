import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: number;
  title: string;
  image_url: string;
  quantity: number;
  price?: number;
};

type CartState = {
  items: Record<number, CartItem>;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: number) => void;
  toggle: (item: Omit<CartItem, "quantity">) => void;
  setQty: (id: number, qty: number) => void;
  clear: () => void;
  totalQty: () => number;
  selectedIds: () => number[];
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
      totalQty: () => Object.values(get().items).reduce((a, b) => a + b.quantity, 0),
      selectedIds: () => Object.keys(get().items).map(Number),
    }),
    { name: "realz-cart" },
  ),
);
