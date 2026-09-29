import Link from "next/link";
import { upstreamApi } from "@/lib/upstream";
import { prisma } from "@/lib/prisma";
import { DollarSign, ShoppingBag, FileText, Settings, RefreshCw, AlertTriangle, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let upstreamBalance = "0.00";
  let balanceError = false;

  try {
    const res = await upstreamApi.getBalance();
    if (res.ok && res.balance) {
      upstreamBalance = res.balance;
    }
  } catch (err) {
    balanceError = true;
  }

  let pendingSlips = 0;
  let totalOrders = 0;
  let totalUsers = 0;

  try {
    [pendingSlips, totalOrders, totalUsers] = await Promise.all([
      prisma.depositSlip.count({ where: { status: "PENDING" } }),
      prisma.order.count(),
      prisma.user.count(),
    ]);
  } catch (err) {
    // DB not connected yet
  }

  const isLowBalance = parseFloat(upstreamBalance) < 5.0;

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Aura Store — Admin Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Realtime monitoring, product catalog & deposit slip approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-sm hover:bg-slate-800 transition"
          >
            Catalog
          </Link>
          <Link
            href="/admin/slips"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition"
          >
            Slips ({pendingSlips})
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Upstream Balance */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Upstream API Balance</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            ${upstreamBalance} USD
          </div>
          {isLowBalance && (
            <p className="flex items-center gap-1 text-xs text-amber-400 mt-2">
              <AlertTriangle className="w-3.5 h-3.5" /> ဒေါ်လာ balance နည်းနေပါသည်၊ ငွေဖြည့်ပါ!
            </p>
          )}
        </div>

        {/* Pending Slips */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Pending Slips (စစ်ဆေးရန်)</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {pendingSlips}
          </div>
          <Link href="/admin/slips" className="text-xs text-blue-400 hover:underline block">
            Slip အတည်ပြုရန် ကြည့်မည် &rarr;
          </Link>
        </div>

        {/* Total Orders */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Total Orders (စုစုပေါင်းအော်ဒါ)</span>
            <ShoppingBag className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-blue-400">
            {totalOrders}
          </div>
          <p className="text-xs text-slate-500">Live digital delivery records</p>
        </div>

        {/* Registered Users */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Total Customers (အသုံးပြုသူများ)</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-400">
            {totalUsers}
          </div>
          <p className="text-xs text-slate-500">Telegram Bot users</p>
        </div>
      </div>

      {/* Quick Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Link
          href="/admin/products"
          className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition space-y-3 block"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white">Product Catalog & MMK Pricing</h3>
          <p className="text-sm text-slate-400">
            Adjust MMK custom prices, profit margins, toggle product visibility and sync live upstream stock.
          </p>
        </Link>

        <Link
          href="/admin/slips"
          className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition space-y-3 block"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white">Slip Verification Desk</h3>
          <p className="text-sm text-slate-400">
            Review KPay and WavePay transaction slips, credit customer wallets, and manage deposit requests.
          </p>
        </Link>

        <Link
          href="/admin/orders"
          className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition space-y-3 block"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white">Orders & Delivery Log</h3>
          <p className="text-sm text-slate-400">
            Search delivered accounts, activation links, refund status, and customer transaction logs.
          </p>
        </Link>
      </div>
    </div>
  );
}
