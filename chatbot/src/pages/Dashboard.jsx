import { MessageSquare, Users, Activity, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getRecentConversations } from "../api/userService";
import { useEffect, useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

const weekBars = [40, 65, 45, 80, 55, 90, 70];
const days = ["M", "T", "W", "T", "F", "S", "S"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveStats, setLiveStats] = useState(null);
  const [liveChats, setLiveChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, chatsRes] = await Promise.all([
          getDashboardStats(),
          getRecentConversations(4),
        ]);
        if (statsRes.success) setLiveStats(statsRes.stats);
        if (chatsRes.success) setLiveChats(chatsRes.conversations || []);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const firstName = user?.fullname?.split(" ")[0] || "there";

  const displayStats = [
    {
      label: "Total Conversations",
      value: liveStats?.totalConversations ?? 0,
      change: "Lifetime",
      icon: <MessageSquare size={17} />,
      iconBg: "bg-indigo-100 dark:bg-indigo-500/15",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Total Messages",
      value: liveStats?.totalMessages ?? 0,
      change: "Lifetime",
      icon: <Users size={17} />,
      iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Active Today",
      value: liveStats?.activeToday ?? 0,
      change: "Today",
      icon: <Activity size={17} />,
      iconBg: "bg-amber-100 dark:bg-amber-500/15",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Usage",
      value: `${liveStats?.messageCount ?? 0} / ${liveStats?.usageLimit ?? 100}`,
      change: `Plan: ${liveStats?.plan ?? "starter"}`,
      icon: <TrendingUp size={17} />,
      iconBg: "bg-pink-100 dark:bg-pink-500/15",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-slate-500 text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-0"> {/* Added padding for mobile view container */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors"
            style={{ fontFamily: "'Syne',sans-serif" }}>
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Welcome back, {firstName} 👋 <span className="hidden xs:inline">Here's what's happening today.</span>
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ThemeToggle />
          <button onClick={() => navigate("/widget-setup")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
            <Zap size={15} /> Quick Setup
          </button>
        </div>
      </div>

      {/* Stats grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {displayStats.map((s, i) => (
          <div key={i} className="rounded-xl p-5 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] transition-colors shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${s.iconBg} ${s.iconColor}`}>
              {s.icon}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{s.label}</div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1 transition-colors">{s.value}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Bottom section: 1 col on mobile, 2 on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recent conversations */}
        <div className="rounded-xl p-5 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] transition-colors shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Recent Conversations</div>
            <button onClick={() => navigate("/DigiChat/chat-logs")}
              className="text-xs text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1e1e2e] hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
              View all
            </button>
          </div>
          
          {/* Mobile Table Container: Scrollable horizontally */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  {["Visitor", "Page", "Msgs", "Status"].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liveChats.length > 0 ? liveChats.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-all">
                    <td className="py-3 text-sm text-slate-700 dark:text-slate-300">
                      V-#{c.visitorId?.slice(-4) || "0000"}
                    </td>
                    <td className="py-3 text-sm text-indigo-600 dark:text-indigo-400 truncate max-w-[100px]">
                      {(() => { try { return new URL(c.page).pathname; } catch { return c.page || "/"; } })()}
                    </td>
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">{c.messageCount || 0}</td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400"
                      }`}>
                        {c.status || "ended"}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Widget status + chart */}
        <div className="rounded-xl p-5 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] transition-colors shadow-sm">
          <div className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Widget Status</div>

          {/* Usage bar */}
          <div className="p-3.5 rounded-xl mb-4 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f0f13] transition-colors">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Monthly Usage</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {liveStats?.messageCount ?? 0}/{liveStats?.usageLimit ?? 100}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06]">
              <div className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(((liveStats?.messageCount ?? 0) / (liveStats?.usageLimit ?? 100)) * 100, 100)}%`,
                  background: "linear-gradient(to right,#4f46e5,#818cf8)"
                }} />
            </div>
          </div>

          {/* Activity chart: Hidden or smaller on mobile to save space if needed */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f0f13] transition-colors">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">This week's activity</div>
            <div className="flex items-end gap-1 h-16 sm:h-20">
              {weekBars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${h}%`, background: "linear-gradient(to top,#4f46e5,#818cf8)" }} />
              ))}
            </div>
            <div className="flex mt-2">
              {days.map((d, i) => (
                <span key={i} className="flex-1 text-center text-[10px] text-slate-500 dark:text-slate-500">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}