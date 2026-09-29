"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  Check,
  Percent,
  DollarSign,
  TrendingUp,
  Tag,
  AlertCircle,
  Save,
} from "lucide-react";
import { formatMmk, formatUsd } from "@/lib/utils/formatters";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  upstreamId: number;
  categoryId: number | null;
  category?: Category | null;
  name: string;
  description: string | null;
  deliveryType?: string;
  upstreamPriceUsd: number;
  mmkPrice: number;
  isCustomPrice: boolean;
  stock: number;
  inStock: boolean;
  isVisible: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");

  // Global pricing settings
  const [usdRate, setUsdRate] = useState("4850");
  const [profitMargin, setProfitMargin] = useState("80");
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit custom price state
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, settRes] = await Promise.all([
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/settings").then((r) => r.json()),
      ]);

      if (prodRes.ok) {
        setProducts(prodRes.data || []);
        setCategories(prodRes.categories || []);
      }
      if (settRes.ok && settRes.data) {
        if (settRes.data.usd_exchange_rate) setUsdRate(settRes.data.usd_exchange_rate);
        if (settRes.data.profit_margin_pct) setProfitMargin(settRes.data.profit_margin_pct);
      }
    } catch (err: any) {
      showNotification("Failed to load catalog: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Settings & Recalculate
  const handleSaveSettingsAndSync = async () => {
    setSavingSettings(true);
    try {
      // 1. Save settings
      const setRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usd_exchange_rate: usdRate,
          profit_margin_pct: profitMargin,
        }),
      });

      if (!setRes.ok) throw new Error("Failed to save pricing settings");

      // 2. Trigger re-sync
      const syncRes = await fetch("/api/admin/sync", { method: "POST" }).then((r) => r.json());
      if (!syncRes.ok) throw new Error(syncRes.error || "Sync failed");

      showNotification(`✅ Settings saved & ${syncRes.syncedProducts} products recalculated with ${profitMargin}% profit margin!`);
      await loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // 1-Click Sync from Upstream
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" }).then((r) => r.json());
      if (res.ok) {
        showNotification(`✅ Successfully synced ${res.syncedProducts} products from Upstream! Balance: $${res.balance}`);
        await loadData();
      } else {
        throw new Error(res.error || "Sync failed");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (product: Product) => {
    try {
      const nextVisible = !product.isVisible;
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, isVisible: nextVisible }),
      }).then((r) => r.json());

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, isVisible: nextVisible } : p))
        );
        showNotification(nextVisible ? `👁️ "${product.name}" visible on Bot` : `🙈 "${product.name}" hidden from Bot`);
      }
    } catch (err: any) {
      showNotification("Failed to update visibility: " + err.message, "error");
    }
  };

  // Save Custom MMK Price
  const handleSavePrice = async (product: Product) => {
    const numPrice = parseFloat(tempPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      showNotification("Please enter a valid MMK price", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          mmkPrice: numPrice,
          isCustomPrice: true,
        }),
      }).then((r) => r.json());

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, mmkPrice: numPrice, isCustomPrice: true } : p))
        );
        setEditingPriceId(null);
        showNotification(`✅ Custom price saved for "${product.name}": ${formatMmk(numPrice)}`);
      }
    } catch (err: any) {
      showNotification("Failed to save price: " + err.message, "error");
    }
  };

  // Reset to formula price
  const handleResetToAuto = async (product: Product) => {
    try {
      const rate = parseFloat(usdRate || "4850");
      const margin = parseFloat(profitMargin || "80");
      const autoPrice = Math.ceil((product.upstreamPriceUsd * rate * (1 + margin / 100)) / 100) * 100;

      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          mmkPrice: autoPrice,
          isCustomPrice: false,
        }),
      }).then((r) => r.json());

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, mmkPrice: autoPrice, isCustomPrice: false } : p))
        );
        showNotification(`🔄 Reset "${product.name}" to auto formula price (${formatMmk(autoPrice)})`);
      }
    } catch (err: any) {
      showNotification("Failed to reset price: " + err.message, "error");
    }
  };

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      selectedCategory === "ALL" || (p.categoryId && p.categoryId.toString() === selectedCategory);
    const matchStock =
      stockFilter === "ALL" ||
      (stockFilter === "IN_STOCK" && p.inStock) ||
      (stockFilter === "OUT_OF_STOCK" && !p.inStock);
    return matchSearch && matchCategory && matchStock;
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 space-y-6 text-slate-100">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-800"
              : "bg-rose-950/90 text-rose-200 border-rose-800"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Product Catalog & MMK Pricing
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Manage sell prices, exchange rate, profit margins & Telegram bot display.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-blue-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from Upstream"}
          </button>
        </div>
      </div>

      {/* Global Pricing & Margin Calculation Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Dynamic MMK Pricing Engine
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Formula: <code className="text-emerald-300 font-mono">MMK = RoundUp(USD * {usdRate} * (1 + {profitMargin}%), 100)</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* USD Rate Input */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <div className="text-xs text-slate-400">USD Rate:</div>
              <input
                type="number"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
                className="w-24 bg-transparent text-white font-mono text-sm focus:outline-none"
                placeholder="4850"
              />
              <span className="text-xs text-slate-500 font-medium">MMK</span>
            </div>

            {/* Profit Margin Input */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
              <Percent className="w-4 h-4 text-emerald-400" />
              <div className="text-xs text-slate-400">Profit Margin:</div>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(e.target.value)}
                className="w-16 bg-transparent text-emerald-300 font-mono text-sm focus:outline-none"
                placeholder="80"
              />
              <span className="text-xs text-slate-500 font-medium">%</span>
            </div>

            {/* Save & Recalculate Button */}
            <button
              onClick={handleSaveSettingsAndSync}
              disabled={savingSettings}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              {savingSettings ? "Recalculating..." : "Apply & Recalculate All"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products or categories (e.g. Canva, ChatGPT, Steam)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Stock</option>
            <option value="IN_STOCK">In Stock Only</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p>Loading products catalog from Supabase...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
            <p className="text-base font-semibold text-white">No products found</p>
            <p className="text-xs">Try searching for a different keyword or click "Sync from Upstream".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Upstream USD Cost</th>
                  <th className="py-3.5 px-4">Sell Price (MMK)</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-center">Bot Visibility</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredProducts.map((p) => {
                  const isEditing = editingPriceId === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition ${
                        !p.isVisible ? "opacity-50 bg-slate-950/40" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span>{p.name}</span>
                          {p.deliveryType && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                              {p.deliveryType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-medium border border-slate-700/50">
                          <Tag className="w-3 h-3 text-blue-400" />
                          {p.category?.name || "Uncategorized"}
                        </span>
                      </td>

                      {/* USD Price */}
                      <td className="py-4 px-4 font-mono text-slate-300">
                        {formatUsd(p.upstreamPriceUsd)}
                      </td>

                      {/* MMK Price & Custom Override */}
                      <td className="py-4 px-4 font-mono">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-28 px-2 py-1 rounded bg-slate-950 border border-blue-500 text-white font-mono text-sm focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePrice(p)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Save custom price"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400 text-base">
                              {formatMmk(p.mmkPrice)}
                            </span>
                            {p.isCustomPrice ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Custom
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20">
                                Auto +{profitMargin}%
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4">
                        {p.inStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ● In Stock ({p.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            ○ Out of Stock
                          </span>
                        )}
                      </td>

                      {/* Visibility Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleVisibility(p)}
                          className={`p-1.5 rounded-lg border transition ${
                            p.isVisible
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                              : "bg-slate-800/40 border-slate-700 text-slate-500 hover:bg-slate-800"
                          }`}
                          title={p.isVisible ? "Visible in Telegram Bot (click to hide)" : "Hidden in Telegram Bot (click to show)"}
                        >
                          {p.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingPriceId(p.id);
                              setTempPrice(p.mmkPrice.toString());
                            }}
                            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                          >
                            Edit Price
                          </button>
                          {p.isCustomPrice && (
                            <button
                              onClick={() => handleResetToAuto(p)}
                              className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                              title="Reset back to formula price"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>
            Showing <strong className="text-white">{filteredProducts.length}</strong> of{" "}
            <strong className="text-white">{products.length}</strong> products
          </div>
          <div>
            Changes made here reflect on Telegram Bot immediately.
          </div>
        </div>
      </div>
    </div>
  );
}
