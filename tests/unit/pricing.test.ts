import { describe, it, expect } from "vitest";
import {
  calculateMmkPrice,
  calculateProfit,
  calculateBulkTotal,
  formatMmk,
  formatUsd,
} from "@/lib/pricing";

describe("Pricing Engine Unit Tests", () => {
  it("should calculate MMK price based on USD, exchange rate, and profit margin", () => {
    // 0.45 USD * 4800 MMK * 1.25 (25% margin) = 2700 MMK
    const price = calculateMmkPrice({
      usdPrice: 0.45,
      exchangeRate: 4800,
      marginPct: 25,
    });
    expect(price).toBe(2700);
  });

  it("should round up to the nearest 100 Ks", () => {
    // 0.33 USD * 4850 MMK * 1.20 = 1920.6 MMK -> rounds up to 2000 MMK
    const price = calculateMmkPrice({
      usdPrice: 0.33,
      exchangeRate: 4850,
      marginPct: 20,
    });
    expect(price).toBe(2000);
  });

  it("should respect custom MMK price override", () => {
    const price = calculateMmkPrice({
      usdPrice: 1.0,
      exchangeRate: 4800,
      marginPct: 25,
      customMmkPrice: 6500,
    });
    expect(price).toBe(6500);
  });

  it("should calculate profit breakdown accurately", () => {
    // USD Cost: $0.45, Exchange Rate: 4,800 MMK, Selling Price: 3,000 MMK
    // Cost MMK = 0.45 * 4800 = 2,160 MMK
    // Gross Profit = 3,000 - 2,160 = 840 MMK
    // Profit Margin % = (840 / 3000) * 100 = 28%
    const breakdown = calculateProfit({
      usdCost: 0.45,
      exchangeRate: 4800,
      sellingPriceMmk: 3000,
    });

    expect(breakdown.costMmk).toBe(2160);
    expect(breakdown.revenueMmk).toBe(3000);
    expect(breakdown.grossProfitMmk).toBe(840);
    expect(breakdown.profitMarginPct).toBe(28);
  });

  it("should calculate bulk totals accurately", () => {
    expect(calculateBulkTotal(2500, 1)).toBe(2500);
    expect(calculateBulkTotal(2500, 5)).toBe(12500);
    expect(calculateBulkTotal(2500, 10)).toBe(25000);
    // Negative or 0 quantity should fallback to 1
    expect(calculateBulkTotal(2500, 0)).toBe(2500);
    expect(calculateBulkTotal(2500, -3)).toBe(2500);
  });

  it("should format currencies correctly", () => {
    expect(formatMmk(2700)).toBe("2,700 Ks");
    expect(formatUsd(0.45)).toBe("$0.45");
  });
});
