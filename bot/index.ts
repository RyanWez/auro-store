import { Bot } from "grammy";
import { registerHandlers } from "./handlers";

const token = process.env.TELEGRAM_BOT_TOKEN || "000000000:AA_MOCK_FALLBACK_TOKEN_123456789";

export const bot = new Bot(token);

registerHandlers(bot);
