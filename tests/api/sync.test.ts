import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/admin/sync/route";
import { prisma } from "@/lib/prisma";
import { upstreamApi } from "@/lib/upstream";

describe("Admin Sync API Route Tests", () => {
  it("should sync categories and products from upstream into database", async () => {
    upstreamApi.getBalance = vi.fn().mockResolvedValue({
      ok: true,
      balance: "1.00",
    });

    upstreamApi.getCategories = vi.fn().mockResolvedValue({
      ok: true,
      data: [{ categoryId: 10, name: "AI Tools" }],
    });

    upstreamApi.getProducts = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          productId: 50,
          name: "Claude API Key",
          price: 3.0,
          stock: 5,
          inStock: true,
        },
      ],
    });

    prisma.setting.findUnique = vi.fn().mockImplementation(({ where }) => {
      if (where.key === "usd_exchange_rate") return Promise.resolve({ value: "4850" });
      if (where.key === "profit_margin_pct") return Promise.resolve({ value: "25" });
      return Promise.resolve(null);
    });

    prisma.category.upsert = vi.fn().mockResolvedValue({});
    prisma.product.upsert = vi.fn().mockResolvedValue({});

    const res = await POST();
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.balance).toBe("1.00");
    expect(json.syncedProducts).toBe(1);
    expect(prisma.product.upsert).toHaveBeenCalled();
  });
});
