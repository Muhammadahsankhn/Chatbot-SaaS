import { useState, useEffect } from "react";
import { TrendingUp, Users, MessageCircle, Zap, Clock, PieChart } from "lucide-react";
import { getAnalytics, getWeeklyActivity, getAllChats } from "../api/userService";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm transition-all ${className}`}>
    {children}
  </div>
);

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [weekMsgs, setWeekMsgs] = useState([0, 0, 0, 0, 0, 0, 0]); // conversations per day
  const [topPages, setTopPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, weekRes, chatsRes] = await Promise.all([
          getAnalytics(),
          getWeeklyActivity(),
          getAllChats({ limit: 200 }),
        ]);

        if (analyticsRes.success) setAnalytics(analyticsRes.analytics);
        if (weekRes.success) setWeekMsgs(weekRes.stats?.weeklyData || [0, 0, 0, 0, 0, 0, 0]);

        // Build top pages from conversation data
        if (chatsRes.success && chatsRes.conversations?.length) {
          const pageMap = {};
          chatsRes.conversations.forEach(c => {
            let page = "/";
            try { page = new URL(c.page).pathname || "/"; } catch { page = c.page || "/"; }
            pageMap[page] = (pageMap[page] || 0) + 1;
          });
          const sorted = Object.entries(pageMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          const maxSessions = sorted[0]?.[1] || 1;
          setTopPages(sorted.map(([page, sessions]) => ({
            page,
            sessions,
            pct: Math.round((sessions / maxSessions) * 100),
          })));
        }
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxWeek = Math.max(...weekMsgs, 1);

  // Build week data combining day labels with real counts
  const weekData = DAYS.map((day, i) => ({
    day,
    conversations: weekMsgs[i] || 0,
  }));

  const kpis = [
    {
      label: "Total Messages",
      value: (analytics?.totalMessages ?? 0).toLocaleString(),
      change: analytics?.totalMessages > 0 ? "+live" : "0",
      icon: MessageCircle,
      color: "text-indigo-500",
      up: true,
    },
    {
      label: "Total Conversations",
      value: (analytics?.totalConversations ?? 0).toLocaleString(),
      change: analytics?.totalConversations > 0 ? "+live" : "0",
      icon: Users,
      color: "text-emerald-500",
      up: true,
    },
    {
      label: "Active Today",
      value: (analytics?.activeToday ?? 0).toLocaleString(),
      change: analytics?.activeToday > 0 ? "today" : "0",
      icon: Zap,
      color: "text-amber-500",
      up: true,
    },
    {
      label: "Avg Msgs/Chat",
      value: analytics?.totalConversations > 0
        ? (analytics.totalMessages / analytics.totalConversations).toFixed(1)
        : "0",
      change: "lifetime",
      icon: TrendingUp,
      color: "text-rose-500",
      up: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-slate-500 text-sm">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto transition-colors pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          style={{ fontFamily: "'Syne',sans-serif" }}>Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time performance metrics for your AI agent.</p>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((s, i) => (
          <Card key={i} className="flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-slate-50 dark:bg-white/5 ${s.color}`}>
                <s.icon size={18} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                ${s.up
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                {s.change}
              </span>
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">{s.label}</div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Conversations this week */}
        <Card>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Conversations This Week</h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md uppercase tracking-tight">
              {weekMsgs.reduce((a, b) => a + b, 0)} total
            </span>
          </div>
          <div className="flex items-end gap-3 h-40 px-2">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {d.conversations}
                </div>
                <div
                  className="w-full rounded-t-md transition-all duration-500 ease-out group-hover:brightness-110 cursor-pointer"
                  style={{
                    height: `${Math.max((d.conversations / maxWeek) * 100, d.conversations > 0 ? 8 : 3)}%`,
                    background: d.conversations > 0
                      ? "linear-gradient(to top, #4f46e5, #818cf8)"
                      : "rgba(99,102,241,0.1)"
                  }}
                />
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600 uppercase">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Messages vs Conversations */}
        <Card>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Summary</h3>
            </div>
            <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-tight">
              Live
            </div>
          </div>

          {/* Summary stats in a nice layout */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: "Total Conversations", value: analytics?.totalConversations ?? 0, color: "#6366f1" },
              { label: "Total Messages", value: analytics?.totalMessages ?? 0, color: "#10b981" },
              { label: "Active Today", value: analytics?.activeToday ?? 0, color: "#f59e0b" },
              {
                label: "Msgs per Chat", value: analytics?.totalConversations > 0
                  ? (analytics.totalMessages / analytics.totalConversations).toFixed(1)
                  : "0",
                color: "#8b5cf6"
              },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                <div className="text-2xl font-bold" style={{ color: s.color }}>
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Engagement bar */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Engagement rate</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {analytics?.totalConversations > 0
                  ? `${Math.min(Math.round((analytics.activeToday / analytics.totalConversations) * 100 * 30), 100)}%`
                  : "0%"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/5">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: analytics?.totalConversations > 0
                    ? `${Math.min(Math.round((analytics.activeToday / analytics.totalConversations) * 100 * 30), 100)}%`
                    : "0%",
                  background: "linear-gradient(to right,#4f46e5,#818cf8)"
                }} />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom: Top Pages + Sentiment ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Pages — real data */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={16} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Most Active Pages</h3>
          </div>
          {topPages.length > 0 ? (
            <div className="space-y-5">
              {topPages.map((p, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors truncate max-w-[70%]">
                      {p.page}
                    </span>
                    <span className="text-slate-500 font-mono shrink-0">{p.sessions} chats</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p.pct}%`, background: "linear-gradient(to right,#4f46e5,#818cf8)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <PieChart size={28} className="text-slate-300 dark:text-slate-600" />
              <span className="text-sm text-slate-500 dark:text-slate-400">No page data yet</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Data appears once visitors use your widget</span>
            </div>
          )}
        </Card>

        {/* Conversation breakdown */}
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Conversation Status</h3>
          </div>

          {analytics?.totalConversations > 0 ? (
            <>
              <div className="flex justify-around items-end h-24 mb-6">
                {[
                  { label: "Today", value: analytics?.activeToday ?? 0, color: "bg-indigo-400", emoji: "📅" },
                  { label: "Total", value: analytics?.totalConversations ?? 0, color: "bg-emerald-400", emoji: "💬" },
                  { label: "Msgs", value: analytics?.totalMessages ?? 0, color: "bg-amber-400", emoji: "✉️" },
                ].map((s, i) => {
                  const maxVal = Math.max(analytics?.totalMessages ?? 1, 1);
                  const h = Math.max(Math.round((s.value / maxVal) * 100), 8);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                      <span className="text-lg group-hover:scale-125 transition-transform">{s.emoji}</span>
                      <div className={`w-10 rounded-t-md transition-all duration-700 ${s.color}`} style={{ height: `${h}%` }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{s.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                  <strong className="text-indigo-600 dark:text-indigo-400">{analytics?.activeToday ?? 0}</strong> conversations started today out of <strong className="text-slate-700 dark:text-slate-300">{analytics?.totalConversations ?? 0}</strong> total.
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <span className="text-3xl">📊</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">No data yet</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 text-center">Embed your widget to start collecting analytics</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}