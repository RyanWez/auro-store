"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  AlertCircle,
  ExternalLink,
  Clock,
  User,
  CreditCard,
  X,
  FileCheck,
} from "lucide-react";
import { formatMmk } from "@/lib/utils/formatters";

interface SlipUser {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  mmkBalance: number;
}

interface DepositSlip {
  id: number;
  userId: number;
  user: SlipUser;
  provider: "KBZ_PAY" | "WAVE_PAY" | "MANUAL_BANK";
  amountMmk: number;
  transactionId: string | null;
  telegramFileId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export default function AdminSlipsPage() {
  const [slips, setSlips] = useState<DepositSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Form states per slip: slipId -> { amount: string, note: string }
  const [slipInputs, setSlipInputs] = useState<Record<number, { amount: string; note: string }>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSlips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slips").then((r) => r.json());
      if (res.ok) {
        setSlips(res.data || []);
      } else {
        throw new Error(res.error || "Failed to load slips");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlips();
  }, []);

  const handleInputChange = (slipId: number, field: "amount" | "note", value: string) => {
    setSlipInputs((prev) => ({
      ...prev,
      [slipId]: {
        amount: field === "amount" ? value : prev[slipId]?.amount || "",
        note: field === "note" ? value : prev[slipId]?.note || "",
      },
    }));
  };

  const handleApprove = async (slip: DepositSlip) => {
    const enteredAmount = parseFloat(slipInputs[slip.id]?.amount || slip.amountMmk.toString());
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      showNotification("Please enter a valid deposit amount to credit", "error");
      return;
    }

    setProcessingId(slip.id);
    try {
      const res = await fetch("/api/admin/slips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipId: slip.id,
          action: "APPROVE",
          amountMmk: enteredAmount,
          note: slipInputs[slip.id]?.note || "Approved by Admin",
        }),
      }).then((r) => r.json());

      if (res.ok) {
        showNotification(`✅ Approved! Credited ${formatMmk(enteredAmount)} to @${slip.user.username || slip.user.firstName}`);
        await loadSlips();
      } else {
        throw new Error(res.error || "Failed to approve slip");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (slip: DepositSlip) => {
    const reason = slipInputs[slip.id]?.note || prompt("Enter rejection reason for customer:") || "";
    if (reason === null) return; // User canceled prompt

    setProcessingId(slip.id);
    try {
      const res = await fetch("/api/admin/slips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipId: slip.id,
          action: "REJECT",
          note: reason || "ငွေလွှဲစလစ် အတည်မပြုနိုင်ပါ",
        }),
      }).then((r) => r.json());

      if (res.ok) {
        showNotification(`❌ Rejected slip #${slip.id} and notified customer via Telegram.`);
        await loadSlips();
      } else {
        throw new Error(res.error || "Failed to reject slip");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Counts
  const pendingCount = slips.filter((s) => s.status === "PENDING").length;
  const approvedCount = slips.filter((s) => s.status === "APPROVED").length;
  const rejectedCount = slips.filter((s) => s.status === "REJECTED").length;

  const filteredSlips = slips.filter((s) => {
    if (activeTab === "ALL") return true;
    return s.status === activeTab;
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

      {/* Fullscreen Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Deposit Slip Fullscreen"
              className="max-h-[85vh] w-auto mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Header */}
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
              Payment Slip Verification Desk
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Review KBZPay & WavePay screenshot submissions and credit customer wallets.
            </p>
          </div>
        </div>

        <button
          onClick={loadSlips}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-medium text-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Slips
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "PENDING"
              ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Pending Approvals</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300">
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("APPROVED")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "APPROVED"
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Approved</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300">
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("REJECTED")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "REJECTED"
              ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Rejected</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300">
            {rejectedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "ALL"
              ? "bg-slate-800 text-white border border-slate-700"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>All Submissions ({slips.length})</span>
        </button>
      </div>

      {/* Slips Content */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p>Loading deposit slips from database...</p>
        </div>
      ) : filteredSlips.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <FileCheck className="w-10 h-10 mx-auto text-slate-500" />
          <p className="text-base font-semibold text-white">No slips found in this tab</p>
          <p className="text-xs">Incoming user top-up slips from Telegram will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSlips.map((slip) => {
            const isProcessing = processingId === slip.id;
            const currentAmount = slipInputs[slip.id]?.amount ?? (slip.amountMmk > 0 ? slip.amountMmk.toString() : "");
            const imageUrl = `/api/admin/slips/image?fileId=${encodeURIComponent(slip.telegramFileId)}`;

            return (
              <div
                key={slip.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between"
              >
                {/* Top: Customer & Provider Meta */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          <span>{slip.user.firstName || "Customer"}</span>
                          {slip.user.username && (
                            <span className="text-xs font-normal text-blue-400 font-mono">
                              @{slip.user.username}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>ID: {slip.user.telegramId}</span>
                          <span>•</span>
                          <span>Wallet: <strong className="text-emerald-400">{formatMmk(slip.user.mmkBalance)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {slip.status === "PENDING" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Pending Review
                        </span>
                      )}
                      {slip.status === "APPROVED" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Approved ({formatMmk(slip.amountMmk)})
                        </span>
                      )}
                      {slip.status === "REJECTED" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission Info Bar */}
                  <div className="flex items-center justify-between text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      <span>{slip.provider === "KBZ_PAY" ? "KBZPay" : slip.provider === "WAVE_PAY" ? "WavePay" : "Bank Transfer"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(slip.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Slip Image Preview Card */}
                  <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950/80 max-h-72 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Payment Slip Screenshot"
                      className="max-h-72 w-full object-contain cursor-pointer transition group-hover:scale-[1.02]"
                      onClick={() => setSelectedImage(imageUrl)}
                    />
                    <div
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer pointer-events-none"
                    >
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur">
                        <Eye className="w-4 h-4" /> Click to Zoom
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom: Approval Form / Actions */}
                <div className="pt-2">
                  {slip.status === "PENDING" ? (
                    <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Deposit Amount (MMK to credit to customer):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Enter amount (e.g. 10000)"
                            value={currentAmount}
                            onChange={(e) => handleInputChange(slip.id, "amount", e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-xs text-slate-400 font-semibold">MMK</span>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[3000, 5000, 10000, 20000, 50000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleInputChange(slip.id, "amount", preset.toString())}
                              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                            >
                              +{preset.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Note */}
                      <div>
                        <input
                          type="text"
                          placeholder="Admin Note / Memo (optional)"
                          value={slipInputs[slip.id]?.note || ""}
                          onChange={(e) => handleInputChange(slip.id, "note", e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => handleApprove(slip)}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {isProcessing ? "Approving..." : "Approve & Credit Balance"}
                        </button>

                        <button
                          onClick={() => handleReject(slip)}
                          disabled={isProcessing}
                          className="px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 font-semibold text-sm transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
                      {slip.approvedAt && (
                        <div>
                          Processed on: <strong className="text-slate-200">{new Date(slip.approvedAt).toLocaleString()}</strong>
                        </div>
                      )}
                      {slip.adminNote && (
                        <div>
                          Note: <span className="text-slate-300 font-mono">{slip.adminNote}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
