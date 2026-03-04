import { useState, useEffect } from "react";
import { CreditCard, Download, ExternalLink, Check, Zap, Loader } from "lucide-react";
import { getDashboardStats } from "../api/userService";

const plans = [
  {
    name: "Starter", price: 9, color: "bg-slate-400",
    msgLimit: 5000,
    desc: "Perfect for small websites and side projects.",
    features: ["5,000 messages/month", "1 website", "Basic analytics", "Email support", "Chat logs (7 days)"],
  },
  {
    name: "Pro", price: 29, color: "bg-indigo-500", popular: true,
    msgLimit: 20000,
    desc: "Best for growing businesses that need more power.",
    features: ["20,000 messages/month", "5 websites", "Advanced analytics", "Priority support", "Chat logs (90 days)", "Custom branding"],
  },
  {
    name: "Enterprise", price: null, color: "bg-emerald-500",
    msgLimit: null,
    desc: "For large organizations with custom requirements.",
    features: ["Unlimited messages", "Unlimited websites", "Full analytics suite", "Dedicated support", "Unlimited chat logs", "SLA guarantee"],
  },
];

export default function Plans() {
  const [billing,  setBilling]  = useState("monthly");
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(res => { if (res.success) setStats(res.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive current plan from stats
  const currentPlan = stats?.plan
    ? stats.plan.charAt(0).toUpperCase() + stats.plan.slice(1)
    : "Starter";

  const messageCount = stats?.messageCount ?? 0;
  const usageLimit   = stats?.usageLimit   ?? 100;
  const usagePct     = Math.min(Math.round((messageCount / usageLimit) * 100), 100);

  // Find current plan's message limit for display
  const currentPlanData = plans.find(p => p.name.toLowerCase() === currentPlan.toLowerCase());

  return (
    <div className="w-full max-w-6xl mx-auto transition-colors pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          style={{ fontFamily: "'Syne',sans-serif" }}>Plans & Billing</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your subscription and view usage statistics.</p>
      </div>

      {/* ── Usage + Current Plan ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

        {/* Usage tracker */}
        <div className="lg:col-span-2 flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/[0.03]">
          <div className="mb-4 md:mb-0 w-full md:w-auto">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-indigo-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Usage</span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 mt-2">
                <Loader size={14} className="animate-spin text-indigo-400" />
                <span className="text-sm text-slate-500">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 transition-colors">
                  {messageCount.toLocaleString()}
                  <span className="text-sm font-medium text-slate-500"> / {usageLimit.toLocaleString()} messages</span>
                </div>
                <div className="w-full md:w-72 h-2 bg-slate-200 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${usagePct}%`,
                      background: usagePct > 80
                        ? "linear-gradient(to right,#ef4444,#f87171)"
                        : "linear-gradient(to right,#4f46e5,#818cf8)"
                    }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-slate-500">{usagePct}% used</span>
                  {usagePct > 80 && (
                    <span className="text-xs text-red-500 font-medium">⚠ Approaching limit</span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 shrink-0">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
              <CreditCard size={14} /> Update Payment
            </button>
          </div>
        </div>

        {/* Active plan */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Plan</span>
          {loading ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader size={14} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 uppercase">
                  {currentPlan}
                </span>
                {currentPlanData?.price && (
                  <span className="text-sm font-medium text-slate-500">
                    ${currentPlanData.price}/mo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentPlanData?.msgLimit
                  ? `${currentPlanData.msgLimit.toLocaleString()} messages/month`
                  : "Unlimited messages"}
              </p>
            </>
          )}
          <button className="mt-4 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors text-left">
            Cancel subscription
          </button>
        </div>
      </div>

      {/* ── Billing toggle ── */}
      <div className="flex flex-col items-center mb-10">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 mb-6">
          {["monthly", "yearly"].map(b => (
            <button key={b} onClick={() => setBilling(b)}
              className={`px-6 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                billing === b
                  ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                  : "text-slate-500"}`}>
              {b}
              {b === "yearly" && <span className="ml-2 text-[10px] text-emerald-500">-20%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {plans.map(plan => {
          const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();
          return (
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

              {isCurrent && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500">
                  ✓ Active
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
                {billing === "yearly" && plan.price && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Save ${Math.round(plan.price * 0.2 * 12)}/year
                  </p>
                )}
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
                isCurrent
                  ? "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-default"
                  : `${plan.color} text-white hover:brightness-110 shadow-lg`
              }`}>
                {isCurrent ? "Current Plan" : plan.price ? "Upgrade Now" : "Talk to Sales"}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Invoice History ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Invoice History</h3>
          <button className="text-[10px] font-bold uppercase text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors">
            View All <ExternalLink size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
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
              {/* Placeholder invoices — connect to payment provider (Stripe etc) when ready */}
              {[
                { date: "Feb 15, 2026", desc: `${currentPlan} Plan – Monthly`, amount: currentPlanData?.price ? `$${currentPlanData.price}.00` : "Custom" },
                { date: "Jan 15, 2026", desc: `${currentPlan} Plan – Monthly`, amount: currentPlanData?.price ? `$${currentPlanData.price}.00` : "Custom" },
              ].map((inv, i) => (
                <tr key={i} className="text-sm hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{inv.date}</td>
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{inv.desc}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Paid
                    </span>
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
        <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
          <p className="text-xs text-slate-400">
            💡 Full invoice history will be available once payment provider (Stripe) is connected.
          </p>
        </div>
      </div>
    </div>
  );
}