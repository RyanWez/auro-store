import { describe, it, expect, vi } from "vitest";
import { getSetting, setSetting, getPricingSettings } from "@/lib/db/settings";

describe("Database Settings Helper Tests", () => {
  it("should return fallback default setting when not found in database", async () => {
    const mockPrisma: any = {
      setting: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const rate = await getSetting("usd_exchange_rate", "4850", mockPrisma);
    expect(rate).toBe("4850");
  });

  it("should parse numeric pricing settings accurately", async () => {
    const mockPrisma: any = {
      setting: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.key === "usd_exchange_rate") return Promise.resolve({ key: "usd_exchange_rate", value: "4900" });
          if (where.key === "profit_margin_pct") return Promise.resolve({ key: "profit_margin_pct", value: "30" });
          return Promise.resolve(null);
        }),
      },
    };

    const pricing = await getPricingSettings(mockPrisma);
    expect(pricing.usdExchangeRate).toBe(4900);
    expect(pricing.profitMarginPct).toBe(30);
  });

  it("should upsert setting properly", async () => {
    const mockPrisma: any = {
      setting: {
        upsert: vi.fn().mockResolvedValue({
          key: "kpay_phone",
          value: "09987654321",
        }),
      },
    };

    const result = await setSetting("kpay_phone", "09987654321", "KBZPay", mockPrisma);
    expect(result.value).toBe("09987654321");
    expect(mockPrisma.setting.upsert).toHaveBeenCalled();
  });
});
