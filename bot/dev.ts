import { bot } from "./index";

async function main() {
  console.log("🚀 Starting Aura Store Telegram Bot in Local Polling Mode...");

  try {
    // Delete any active webhook so long polling can receive updates without conflict
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.log("🧹 Previous Webhook cleared (drop_pending_updates: true)");

    const me = await bot.api.getMe();
    console.log(`🤖 Bot connected successfully: @${me.username} (${me.first_name})`);
    console.log("⚡ Listening for incoming messages via Long Polling...");
    console.log("👉 Open Telegram and send /start to your bot to test!\n");

    // Start long polling
    await bot.start({
      onStart: () => {
        console.log("🟢 Polling started. Press Ctrl+C to stop.");
      },
    });
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once("SIGINT", () => {
  console.log("\n🛑 Stopping bot...");
  bot.stop();
  process.exit(0);
});

process.once("SIGTERM", () => {
  console.log("\n🛑 Stopping bot...");
  bot.stop();
  process.exit(0);
});

main();
