// Realz tiered pricing engine
// Bulk pricing applied to the TOTAL sticker count across the whole cart.
export type Tier = {
  min: number;
  max: number | null;
  unitPrice: number;
  label: string;
};

export const TIERS: Tier[] = [
  { min: 1, max: 9, unitPrice: 1.9, label: "1–9 stickers" },
  { min: 10, max: 19, unitPrice: 1.5, label: "10–19 stickers" },
  { min: 20, max: 49, unitPrice: 1.2, label: "20–49 stickers" },
  { min: 50, max: null, unitPrice: 0.8, label: "50+ stickers" },
];

export function unitPriceFor(totalQty: number): number {
  const tier = TIERS.find((t) => totalQty >= t.min && (t.max === null || totalQty <= t.max));
  return tier?.unitPrice ?? TIERS[0].unitPrice;
}

export function activeTier(totalQty: number): Tier {
  return TIERS.find((t) => totalQty >= t.min && (t.max === null || totalQty <= t.max)) ?? TIERS[0];
}

export function subtotal(totalQty: number): number {
  return +(totalQty * unitPriceFor(totalQty)).toFixed(2);
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}
