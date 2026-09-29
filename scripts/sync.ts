import { syncUpstreamCatalog } from "../lib/sync";

async function main() {
  console.log("🔄 Starting Upstream Catalog Sync...");
  const res = await syncUpstreamCatalog();
  console.log("✅ Sync Completed successfully!");
  console.log(`💰 Upstream Balance: $${res.balance} USD`);
  console.log(`📂 Categories Synced: ${res.syncedCategories}`);
  console.log(`📦 Products Synced: ${res.syncedProducts}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Sync Failed:", err);
  process.exit(1);
});
