import { useState } from "react";
import { CreditCard, Download, ExternalLink, Check, Zap, AlertCircle } from "lucide-react";

const plans = [
  {
    name: "Starter", price: 9, color: "bg-slate-400",
    desc: "Perfect for small websites and side projects.",
    features: ["5,000 messages/month", "1 website", "Basic analytics", "Email support", "Chat logs (7 days)"],
  },
  {
    name: "Pro", price: 29, color: "bg-indigo-500", popular: true,
    desc: "Best for growing businesses that need more power.",
    features: ["20,000 messages/month", "5 websites", "Advanced analytics", "Priority support", "Chat logs (90 days)", "Custom branding"],
  },
  {
    name: "Enterprise", price: null, color: "bg-emerald-500",
    desc: "For large organizations with custom requirements.",
    features: ["Unlimited messages", "Unlimited websites", "Full analytics suite", "Dedicated support", "Unlimited chat logs", "SLA guarantee"],
  },
];

export default function Plans() {
  const [current] = useState("Pro");
  const [billing, setBilling] = useState("monthly");

  return (
    <div className="w-full max-w-6xl mx-auto transition-colors pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          style={{ fontFamily: "'Syne',sans-serif" }}>
          Plans & Billing
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage your subscription and view usage statistics.</p>
      </div>

      {/* Usage Tracker & Current Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/[0.03]">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center gap-2 mb-1">
               <Zap size={16} className="text-indigo-500" />
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Usage</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 transition-colors">
              12,402 <span className="text-sm font-medium text-slate-500">/ 20,000 messages</span>
            </div>
            <div className="w-full md:w-64 h-2 bg-slate-200 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
               <div className="h-full bg-indigo-500 rounded-full" style={{ width: '62%' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all">
              <CreditCard size={14} /> Update Payment
            </button>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Plan</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">PRO</span>
              <span className="text-sm font-medium text-slate-500">Renews Mar 15</span>
            </div>
            <button className="mt-4 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1">
              Cancel subscription
            </button>
        </div>
      </div>

      {/* Pricing Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 mb-6">
          {["monthly", "yearly"].map(b => (
            <button key={b} onClick={() => setBilling(b)}
              className={`px-6 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                billing === b ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500"
              }`}>
              {b}
              {b === "yearly" && <span className="ml-2 text-[10px] text-emerald-500">-20%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {plans.map(plan => (
          <div key={plan.name}
            className={`relative rounded-2xl p-8 border transition-all flex flex-col ${
              plan.popular 
              ? "border-indigo-500 dark:border-indigo-500/50 shadow-xl shadow-indigo-500/5 bg-white dark:bg-[#1c1c2b] scale-105 z-10" 
              : "border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e]"
            }`}>

            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-indigo-500">
                Most Popular
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                {plan.price !== null ? (
                  <>
                    <span className="text-4xl font-black text-slate-900 dark:text-slate-100">
                      ${billing === "yearly" ? Math.floor(plan.price * 0.8) : plan.price}
                    </span>
                    <span className="text-slate-500 text-sm font-medium">/mo</span>
                  </>
                ) : (
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100">Custom</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">{plan.desc}</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check size={12} className="text-emerald-500" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${
              current === plan.name 
              ? "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-default" 
              : `${plan.color} text-white hover:brightness-110 shadow-lg shadow-indigo-500/10`
            }`}>
              {current === plan.name ? "Current Plan" : plan.price ? "Upgrade Now" : "Talk to Sales"}
            </button>
          </div>
        ))}
      </div>

      {/* Invoice history */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Invoice History</h3>
          <button className="text-[10px] font-bold uppercase text-indigo-500 flex items-center gap-1">
            View All <ExternalLink size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/[0.03]">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {[
                { date: "Feb 15, 2026", desc: "Pro Plan – Monthly", amount: "$29.00" },
                { date: "Jan 15, 2026", desc: "Pro Plan – Monthly", amount: "$29.00" },
              ].map((inv, i) => (
                <tr key={i} className="text-sm hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{inv.date}</td>
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{inv.desc}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Paid</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}