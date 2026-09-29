/**
 * Lightweight in-memory session manager for Telegram Bot conversations
 */

interface UserSessionState {
  step: "IDLE" | "WAITING_CUSTOM_QTY" | "WAITING_SLIP_PHOTO";
  productId?: number;
  paymentProvider?: "KBZ_PAY" | "WAVE_PAY";
  updatedAt: number;
}

const sessions = new Map<string, UserSessionState>();

export const sessionManager = {
  get(telegramId: string | number): UserSessionState {
    const key = String(telegramId);
    return sessions.get(key) || { step: "IDLE", updatedAt: Date.now() };
  },

  set(telegramId: string | number, state: Partial<UserSessionState>) {
    const key = String(telegramId);
    const existing = this.get(telegramId);
    sessions.set(key, { ...existing, ...state, updatedAt: Date.now() });
  },

  clear(telegramId: string | number) {
    sessions.delete(String(telegramId));
  },
};
