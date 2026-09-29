import { describe, it, expect, vi } from "vitest";
import { createDepositSlip, approveDepositSlip, rejectDepositSlip } from "@/lib/db/slips";

describe("Database Deposit Slips Helper Tests", () => {
  it("should create a pending deposit slip", async () => {
    const mockPrisma: any = {
      depositSlip: {
        create: vi.fn().mockResolvedValue({
          id: 10,
          userId: 1,
          provider: "KBZ_PAY",
          amountMmk: 10000,
          telegramFileId: "file_abc123",
          status: "PENDING",
        }),
      },
    };

    const slip = await createDepositSlip(
      {
        userId: 1,
        provider: "KBZ_PAY",
        amountMmk: 10000,
        telegramFileId: "file_abc123",
      },
      mockPrisma
    );

    expect(slip.id).toBe(10);
    expect(slip.status).toBe("PENDING");
    expect(mockPrisma.depositSlip.create).toHaveBeenCalled();
  });

  it("should atomically approve a slip and increment user balance", async () => {
    const mockSlip = {
      id: 10,
      userId: 1,
      amountMmk: 10000,
      status: "PENDING",
      user: { id: 1, mmkBalance: 5000 },
    };

    const mockTx: any = {
      depositSlip: {
        update: vi.fn().mockResolvedValue({
          ...mockSlip,
          status: "APPROVED",
          amountMmk: 10000,
        }),
      },
      user: {
        update: vi.fn().mockResolvedValue({
          id: 1,
          mmkBalance: 15000,
        }),
      },
    };

    const mockPrisma: any = {
      depositSlip: {
        findUnique: vi.fn().mockResolvedValue(mockSlip),
      },
      $transaction: vi.fn().mockImplementation((callback) => callback(mockTx)),
    };

    const result = await approveDepositSlip({ slipId: 10 }, mockPrisma);
    expect(result.slip.status).toBe("APPROVED");
    expect(result.user.mmkBalance).toBe(15000);
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { mmkBalance: { increment: 10000 } },
      })
    );
  });

  it("should reject an already processed slip", async () => {
    const mockSlip = {
      id: 10,
      userId: 1,
      status: "APPROVED",
    };

    const mockPrisma: any = {
      depositSlip: {
        findUnique: vi.fn().mockResolvedValue(mockSlip),
      },
    };

    await expect(approveDepositSlip({ slipId: 10 }, mockPrisma)).rejects.toThrow(
      "already APPROVED"
    );
  });
});
