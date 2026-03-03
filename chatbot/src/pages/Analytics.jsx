import { TrendingUp, Users, MessageCircle, Zap, Clock, PieChart } from "lucide-react";

const weekData = [
  { day: "Mon", messages: 120, visitors: 45 },
  { day: "Tue", messages: 180, visitors: 72 },
  { day: "Wed", messages: 150, visitors: 60 },
  { day: "Thu", messages: 220, visitors: 88 },
  { day: "Fri", messages: 190, visitors: 76 },
  { day: "Sat", messages: 80, visitors: 32 },
  { day: "Sun", messages: 60, visitors: 24 },
];

const topPages = [
  { page: "/pricing", sessions: 342, pct: 90 },
  { page: "/home", sessions: 280, pct: 74 },
  { page: "/contact", sessions: 201, pct: 53 },
  { page: "/docs", sessions: 155, pct: 41 },
  { page: "/about", sessions: 88, pct: 23 },
];

const maxMsg = Math.max(...weekData.map(d => d.messages));
const maxVis = Math.max(...weekData.map(d => d.visitors));

const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm transition-all ${className}`}>
    {children}
  </div>
);

export default function Analytics() {
  return (
    <div className="w-full max-w-7xl mx-auto transition-colors pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time performance metrics for your AI agent.</p>
      </div>

      {/* KPI GRID: Responsive from 1 to 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Messages", value: "1,000", change: "+18%", icon: MessageCircle, color: "text-indigo-500" },
          { label: "Unique Visitors", value: "397", change: "+11%", icon: Users, color: "text-emerald-500" },
          { label: "Avg. Response", value: "1.2s", change: "-0.4s", icon: Zap, color: "text-amber-500" },
          { label: "Bounce Rate", value: "28%", change: "-4%", icon: TrendingUp, color: "text-rose-500" },
        ].map((s, i) => (
          <Card key={i} className="flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-slate-50 dark:bg-white/5 ${s.color}`}>
                <s.icon size={18} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.change.startsWith('+') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                {s.change}
              </span>
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">{s.label}</div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* CHARTS GRID: Stacks on mobile, 2 cols on tablet+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Messages Chart */}
        <Card>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Message Volume</h3>
            </div>
            <select className="text-[10px] font-bold uppercase bg-slate-50 dark:bg-white/5 border-none rounded-md px-2 py-1 text-slate-500 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-end gap-3 h-40 px-2">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  {d.messages}
                </div>
                <div 
                  className="w-full rounded-t-md transition-all duration-500 ease-out group-hover:brightness-110 cursor-pointer"
                  style={{ height: `${(d.messages / maxMsg) * 100}%`, background: "linear-gradient(to top, #4f46e5, #818cf8)" }} 
                />
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600 uppercase">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Visitors Chart */}
        <Card>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Visitor Traffic</h3>
            </div>
            <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-tight">Live: 12 Active</div>
          </div>
          <div className="flex items-end gap-3 h-40 px-2">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {d.visitors}
                </div>
                <div 
                  className="w-full rounded-t-md transition-all duration-500 ease-out group-hover:brightness-110 cursor-pointer"
                  style={{ height: `${(d.visitors / maxVis) * 100}%`, background: "linear-gradient(to top, #059669, #34d399)" }} 
                />
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600 uppercase">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* BOTTOM SECTION: Pages & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages - Spans 2 cols on large screens */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={16} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Most Active Pages</h3>
          </div>
          <div className="space-y-5">
            {topPages.map((p, i) => (
              <div key={i} className="group">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">{p.page}</span>
                  <span className="text-slate-500 font-mono">{p.sessions} hits</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${p.pct}%`, background: "linear-gradient(to right, #4f46e5, #818cf8)" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* User Satisfaction */}
        <Card>
          <div className="flex items-center gap-2 mb-8">
            <Clock size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Sentiment Overview</h3>
          </div>
          <div className="flex justify-around items-end h-24 mb-6">
            {[
              { emoji: "😞", label: "Neg", pct: 10, color: "bg-rose-400" },
              { emoji: "😐", label: "Neu", pct: 18, color: "bg-slate-400" },
              { emoji: "😊", label: "Pos", pct: 72, color: "bg-emerald-400" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-xl group-hover:scale-125 transition-transform">{s.emoji}</span>
                <div className={`w-10 rounded-t-md transition-all duration-700 ${s.color}`} style={{ height: `${s.pct}%` }} />
                <span className="text-[10px] font-bold text-slate-500 uppercase">{s.pct}%</span>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <p className="text-[11px] text-slate-500 leading-relaxed text-center italic">
              "72% of users reported a positive experience this week."
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}