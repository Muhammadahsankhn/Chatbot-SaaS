import { useState } from "react";
import { Search, X, MessageSquare, Filter, Calendar, ChevronRight } from "lucide-react";

const logs = [
  { id:1, visitor:"Visitor #4821", page:"/pricing", messages:6, started:"Today, 2:30 PM", duration:"4m 12s", status:"active", preview:"What plans do you offer?" },
  { id:2, visitor:"Visitor #4820", page:"/home", messages:3, started:"Today, 1:15 PM", duration:"1m 45s", status:"ended", preview:"Hi, how are you?" },
  { id:3, visitor:"Visitor #4819", page:"/contact", messages:9, started:"Today, 11:02 AM", duration:"8m 30s", status:"ended", preview:"I need help with my order" },
  { id:4, visitor:"Visitor #4818", page:"/docs", messages:2, started:"Today, 9:45 AM", duration:"0m 52s", status:"ended", preview:"Where is the API docs?" },
  { id:5, visitor:"Visitor #4817", page:"/pricing", messages:12, started:"Yesterday, 5:20 PM", duration:"11m 03s", status:"ended", preview:"Can I get a refund?" },
];

const convo = [
  { role:"bot", text:"Hi there! 👋 How can I help you today?" },
  { role:"user", text:"What plans do you offer?" },
  { role:"bot", text:"We have three plans: Starter ($9/mo), Pro ($29/mo), and Enterprise (custom). Want details?" },
  { role:"user", text:"Tell me about Pro" },
  { role:"bot", text:"Pro includes 20,000 messages/month, 5 websites, priority support, and advanced analytics!" },
];

export default function ChatLogs() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = logs.filter(l =>
    l.visitor.toLowerCase().includes(search.toLowerCase()) ||
    l.page.toLowerCase().includes(search.toLowerCase()) ||
    l.preview.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="transition-colors w-full max-w-[1400px] mx-auto pb-10">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily:"'Syne',sans-serif" }}>Chat Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Review and analyze visitor interactions.</p>
        </div>
        
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-white/5 transition-colors">
             <Calendar size={14} /> Last 7 Days
           </button>
           <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-white/5 transition-colors">
             <Filter size={14} /> Filter
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Table Container - Expands to fill available space */}
        <div className="flex-1 w-full rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden bg-white dark:bg-[#16161e] shadow-sm transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-white/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                placeholder="Search by visitor, page, or message content..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all" 
              />
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                  {["Visitor","Page","Preview","Msgs","Duration","Started","Status"].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 py-4 transition-colors">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {filtered.map(log => (
                  <tr key={log.id} 
                    onClick={() => setSelected(selected?.id === log.id ? null : log)}
                    className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${selected?.id === log.id ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{log.visitor}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium">{log.page}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{log.preview}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{log.messages}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{log.duration}</td>
                    <td className="px-4 py-4 text-xs text-slate-400">{log.started}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${log.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"}`}>
                          {log.status}
                        </span>
                        <ChevronRight size={14} className={`text-slate-300 transition-transform ${selected?.id === log.id ? "rotate-90 text-indigo-500" : "group-hover:translate-x-1"}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-4">
                  <MessageSquare size={24} className="opacity-20" />
                </div>
                <span className="text-sm font-medium">No conversations match your search</span>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Panel - Responsive Behavior */}
        {selected && (
          <div className="w-full lg:w-[400px] animate-in slide-in-from-right-4 duration-300 shrink-0 lg:sticky lg:top-6">
            <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden bg-white dark:bg-[#16161e] shadow-xl transition-colors">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{selected.visitor}</span>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-400 transition-colors">
                    <X size={16}/>
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 font-medium">
                  <span className="text-indigo-500">{selected.page}</span>
                  <span>•</span>
                  <span>{selected.duration} session</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-5 h-[450px] overflow-y-auto bg-slate-50/30 dark:bg-transparent">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white dark:bg-white/5 px-2 py-1 rounded border border-slate-100 dark:border-white/5">
                    {selected.started}
                  </span>
                </div>

                {convo.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1 px-1">
                      {msg.role === "user" ? "Visitor" : "AI Assistant"}
                    </span>
                    <div className={`max-w-[90%] px-4 py-3 text-xs leading-relaxed shadow-sm transition-colors ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-none" 
                        : "bg-white dark:bg-[#1e1e2e] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 rounded-2xl rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                 <button className="w-full py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors">
                   Export Transcript
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}