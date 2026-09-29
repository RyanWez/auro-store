import Link from "next/link";
import { ShieldCheck, Zap, Bot, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
          <Zap className="w-4 h-4" /> Aura Store System Online
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
          Aura Digital Store
        </h1>
        
        <p className="text-slate-400 text-lg leading-relaxed">
          High-performance Telegram Bot Reseller Platform & Web Admin Hub. Automated fulfillment with MMK payment support.
        </p>

        <div className="pt-4 flex flex-wrap gap-4 justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-500/20"
          >
            Admin Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://t.me/AuraStoreOfficial"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium transition"
          >
            <Bot className="w-4 h-4" /> Telegram Bot
          </a>
        </div>
      </div>
    </main>
  );
}
