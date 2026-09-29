import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Orders & Delivery Log</h1>
            <p className="text-slate-400 text-sm">Realtime audit trail of all automated digital deliveries</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <p>No customer orders recorded yet.</p>
      </div>
    </div>
  );
}
