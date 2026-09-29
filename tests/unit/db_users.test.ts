import { describe, it, expect, vi } from "vitest";
import { getOrCreateUser, adjustUserBalance } from "@/lib/db/users";

describe("Database Users Helper Tests", () => {
  it("should upsert user with proper telegramId and profile", async () => {
    const mockPrisma: any = {
      user: {
        upsert: vi.fn().mockResolvedValue({
          id: 1,
          telegramId: BigInt(123456789),
          username: "john_doe",
          firstName: "John",
          mmkBalance: 0,
        }),
      },
    };

    const user = await getOrCreateUser(
      123456789,
      { username: "john_doe", firstName: "John" },
      mockPrisma
    );

    expect(user.id).toBe(1);
    expect(user.username).toBe("john_doe");
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { telegramId: BigInt(123456789) },
      })
    );
  });

  it("should adjust user balance correctly and increment spent on deduction", async () => {
    const mockPrisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          mmkBalance: 10000,
        }),
        update: vi.fn().mockResolvedValue({
          id: 1,
          mmkBalance: 7500,
          totalSpent: 2500,
        }),
      },
    };

    const updated = await adjustUserBalance(1, -2500, mockPrisma);
    expect(updated.mmkBalance).toBe(7500);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          mmkBalance: { increment: -2500 },
          totalSpent: { increment: 2500 },
        }),
      })
    );
  });

  it("should throw error if balance adjustment causes negative balance", async () => {
    const mockPrisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          mmkBalance: 1000,
        }),
      },
    };

    await expect(adjustUserBalance(1, -5000, mockPrisma)).rejects.toThrow(
      "Insufficient balance"
    );
  });
});
