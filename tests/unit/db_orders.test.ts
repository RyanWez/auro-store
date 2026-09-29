import { describe, it, expect, vi } from "vitest";
import { executeAtomicOrderPurchase } from "@/lib/db/orders";

describe("Database Order Execution Helper Tests", () => {
  it("should fail gracefully if user has insufficient MMK balance without calling upstream", async () => {
    const mockPrisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          mmkBalance: 1000, // only 1000 MMK
          isBanned: false,
        }),
      },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: 5,
          upstreamId: 50,
          name: "Claude API Key",
          mmkPrice: 15000, // requires 15000 MMK
          isVisible: true,
          inStock: true,
        }),
      },
    };

    const mockUpstream: any = {
      createOrder: vi.fn(),
    };

    await expect(
      executeAtomicOrderPurchase(
        {
          userId: 1,
          productId: 5,
          quantity: 1,
          upstreamClient: mockUpstream,
        },
        mockPrisma
      )
    ).rejects.toThrow("Insufficient wallet balance");

    // Ensure upstream API was NOT called
    expect(mockUpstream.createOrder).not.toHaveBeenCalled();
  });

  it("should execute order, deduct user balance, and record order when balance is sufficient", async () => {
    const mockPrisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          mmkBalance: 20000,
          isBanned: false,
        }),
        update: vi.fn().mockResolvedValue({
          id: 1,
          mmkBalance: 5000,
        }),
      },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: 5,
          upstreamId: 50,
          name: "Claude API Key",
          upstreamPriceUsd: 3.0,
          mmkPrice: 15000,
          isVisible: true,
          inStock: true,
        }),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: 101,
          externalOrderId: "aura_ord_1",
          status: "COMPLETED",
        }),
      },
      $transaction: vi.fn().mockImplementation(async (operations) => {
        return Promise.all(operations);
      }),
    };

    const mockUpstream: any = {
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        order: { orderId: 999, unitPrice: 3.0 },
        delivery: {
          type: "TEXT",
          lines: ["sk-ant-test-delivered-token"],
        },
      }),
    };

    const result = await executeAtomicOrderPurchase(
      {
        userId: 1,
        productId: 5,
        quantity: 1,
        externalOrderId: "aura_ord_1",
        upstreamClient: mockUpstream,
      },
      mockPrisma
    );

    expect(result.ok).toBe(true);
    expect(result.deliveryLines).toContain("sk-ant-test-delivered-token");
    expect(result.remainingMmkBalance).toBe(5000);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
