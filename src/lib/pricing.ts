// Realz tiered pricing engine
// Bulk pricing applied to the TOTAL sticker count across the whole cart using a progressive stepwise model.

export type Tier = {
  min: number;
  max: number | null;
  unitPrice: number;
  label: string;
  description: string;
};

export const TIERS: Tier[] = [
  { min: 1, max: 20, unitPrice: 15.50, label: "1–20", description: "15.50 KSh base" },
  { min: 21, max: 45, unitPrice: 13.49, label: "21–45", description: "+13.49 KSh extra" },
  { min: 46, max: null, unitPrice: 10.99, label: "46+", description: "+10.99 KSh wholesale" },
];

export function activeTier(totalQty: number): Tier {
  return TIERS.find((t) => totalQty >= t.min && (t.max === null || totalQty <= t.max)) ?? TIERS[0];
}

export function getBreakdown(totalQty: number): { qty: number, price: number }[] {
  const breakdown: { qty: number, price: number }[] = [];
  if (totalQty > 0) {
    const b1Qty = Math.min(totalQty, 20);
    breakdown.push({ qty: b1Qty, price: 15.50 });
  }
  if (totalQty > 20) {
    const b2Qty = Math.min(totalQty - 20, 25);
    breakdown.push({ qty: b2Qty, price: 13.49 });
  }
  if (totalQty > 45) {
    const b3Qty = totalQty - 45;
    breakdown.push({ qty: b3Qty, price: 10.99 });
  }
  return breakdown;
}

export function unitPriceFor(totalQty: number): number {
  return totalQty > 0 ? +(subtotal(totalQty) / totalQty).toFixed(2) : 0;
}

export function subtotal(totalQty: number): number {
  return +getBreakdown(totalQty).reduce((acc, curr) => acc + (curr.qty * curr.price), 0).toFixed(2);
}

export function formatPrice(n: number): string {
  return `${n.toFixed(2)} KSh`;
}
