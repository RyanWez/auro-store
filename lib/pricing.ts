/**
 * Pricing & Profit calculation engine for Aura Store
 */

export interface PricingOptions {
  usdPrice: number;
  exchangeRate: number; // e.g., 4850 MMK/USD
  marginPct: number;    // e.g., 25 (%)
  customMmkPrice?: number | null;
  roundingStep?: number; // default 100 MMK
}

export interface ProfitBreakdown {
  costMmk: number;
  revenueMmk: number;
  grossProfitMmk: number;
  profitMarginPct: number;
}

/**
 * Calculates final MMK selling price with exchange rate, profit margin and rounding.
 * If customMmkPrice is set and > 0, it overrides dynamic calculation.
 */
export function calculateMmkPrice(options: PricingOptions): number {
  if (options.customMmkPrice && options.customMmkPrice > 0) {
    return Math.ceil(options.customMmkPrice / (options.roundingStep || 100)) * (options.roundingStep || 100);
  }

  const step = options.roundingStep || 100;
  const rawMmk = options.usdPrice * options.exchangeRate * (1 + options.marginPct / 100);
  return Math.ceil(rawMmk / step) * step;
}

/**
 * Calculates profit breakdown given wholesale USD cost and final MMK retail price
 */
export function calculateProfit(params: {
  usdCost: number;
  exchangeRate: number;
  sellingPriceMmk: number;
}): ProfitBreakdown {
  const costMmk = Math.round(params.usdCost * params.exchangeRate);
  const revenueMmk = params.sellingPriceMmk;
  const grossProfitMmk = revenueMmk - costMmk;
  const profitMarginPct = revenueMmk > 0 ? (grossProfitMmk / revenueMmk) * 100 : 0;

  return {
    costMmk,
    revenueMmk,
    grossProfitMmk,
    profitMarginPct: Math.round(profitMarginPct * 100) / 100,
  };
}

/**
 * Calculates total MMK for a given quantity
 */
export function calculateBulkTotal(unitPriceMmk: number, quantity: number): number {
  const validQty = Math.max(1, Math.floor(quantity));
  return unitPriceMmk * validQty;
}

export { formatMmk, formatUsd } from "./utils/formatters";
