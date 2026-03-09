import { useState, useEffect, useCallback } from "react";
import { Search, X, MessageSquare, Filter, Calendar, ChevronRight, ChevronLeft, Loader, Download } from "lucide-react";
import { getAllChats } from "../api/userService";
import api from "../api/api";

const PAGE_SIZE = 15;

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now   = new Date();
  const diff  = now - date;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1)  return "Just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `Today, ${date.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}`;
  if (days  === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}`;
  return date.toLocaleDateString([], { month:"short", day:"numeric" });
}

function formatPage(raw) {
  if (!raw) return "/";
  try { return new URL(raw).pathname || "/"; } catch { return raw; }
}

export default function ChatLogs() {
  const [logs,        setLogs]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [msgLoading,  setMsgLoading]  = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Load conversations ──
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllChats({
        page,
        limit:  PAGE_SIZE,
        search,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (res.success) {
        setLogs(res.conversations || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error("ChatLogs load error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // ── Load messages for selected conversation ──
  const loadMessages = async (sessionId) => {
    setMsgLoading(true);
    setMessages([]);
    try {
      const res = await api.get(`/api/v1/chat/conversations/:${sessionId}`);
      if (res.data?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error("Message load error:", err);
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  };

  const handleSelect = (log) => {
    if (selected?.sessionId === log.sessionId) {
      setSelected(null);
      setMessages([]);
    } else {
      setSelected(log);
      loadMessages(log.sessionId);
    }
  };

  // ── Export transcript ──
  const exportTranscript = () => {
    if (!selected || !messages.length) return;
    const lines = [
      `Chat Transcript`,
      `Visitor: ${selected.visitorId || "Unknown"}`,
      `Page: ${formatPage(selected.page)}`,
      `Date: ${formatDate(selected.createdAt)}`,
      `Messages: ${selected.messageCount}`,
      `──────────────────────────────`,
      ...messages.map(m => `[${m.role === "user" ? "Visitor" : "AI"}] ${m.content || m.text || ""}`)
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `chat-${selected.sessionId?.slice(-6) || "log"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="transition-colors w-full max-w-[1400px] mx-auto pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
            style={{ fontFamily: "'Syne',sans-serif" }}>Chat Logs</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total > 0 ? `${total.toLocaleString()} total conversations` : "Review and analyze visitor interactions."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          {["all", "active", "ended"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  : "border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 bg-white dark:bg-white/5"
              }`}>
              {s === "all" ? <Filter size={13} /> : <div className={`w-1.5 h-1.5 rounded-full ${s === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />}
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Table ── */}
        <div className="flex-1 w-full rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden bg-white dark:bg-[#16161e] shadow-sm transition-colors">

          {/* Search */}
          <div className="p-4 border-b border-slate-200 dark:border-white/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by visitor ID, page, or session..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                  {["Visitor", "Page", "Preview", "Msgs", "Started", "Status"].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader size={20} className="animate-spin text-indigo-400" />
                        <span className="text-sm text-slate-500">Loading conversations...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                          <MessageSquare size={22} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">
                          {search ? "No conversations match your search" : "No conversations yet"}
                        </span>
                        {!search && <span className="text-xs text-slate-400">Embed your widget to start collecting chats</span>}
                      </div>
                    </td>
                  </tr>
                ) : logs.map(log => (
                  <tr key={log.sessionId || log._id}
                    onClick={() => handleSelect(log)}
                    className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                      selected?.sessionId === log.sessionId ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""
                    }`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          V-#{log.visitorId?.slice(-6) || "000000"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium max-w-[120px] truncate">
                      {formatPage(log.page)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                      {log.lastMessage || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{log.messageCount || 0}</td>
                    <td className="px-4 py-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          log.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"
                        }`}>
                          {log.status || "ended"}
                        </span>
                        <ChevronRight size={14} className={`text-slate-300 transition-transform shrink-0 ${
                          selected?.sessionId === log.sessionId ? "rotate-90 text-indigo-500" : "group-hover:translate-x-1"
                        }`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
              <span className="text-xs text-slate-500">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 px-2">
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Conversation Panel ── */}
        {selected && (
          <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-6">
            <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden bg-white dark:bg-[#16161e] shadow-xl transition-colors">

              {/* Panel header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    V-#{selected.visitorId?.slice(-6) || "000000"}
                  </span>
                  <button onClick={() => { setSelected(null); setMessages([]); }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-400 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 font-medium flex-wrap">
                  <span className="text-indigo-500">{formatPage(selected.page)}</span>
                  <span>•</span>
                  <span>{selected.messageCount} messages</span>
                  <span>•</span>
                  <span>{formatDate(selected.createdAt)}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex flex-col gap-4 p-5 h-[420px] overflow-y-auto bg-slate-50/30 dark:bg-transparent">
                {msgLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader size={18} className="animate-spin text-indigo-400" />
                    <span className="text-xs text-slate-500">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <MessageSquare size={24} className="text-slate-300 dark:text-slate-600" />
                    <span className="text-xs text-slate-500">No messages found for this session</span>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white dark:bg-white/5 px-2 py-1 rounded border border-slate-100 dark:border-white/5">
                        {formatDate(selected.createdAt)}
                      </span>
                    </div>
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1 px-1">
                          {msg.role === "user" ? "Visitor" : "AI Assistant"}
                        </span>
                        <div className={`max-w-[90%] px-4 py-3 text-xs leading-relaxed shadow-sm ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-none"
                            : "bg-white dark:bg-[#1e1e2e] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 rounded-2xl rounded-tl-none"
                        }`}>
                          {msg.content || msg.text || ""}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Export */}
              <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <button onClick={exportTranscript} disabled={!messages.length}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Download size={13} /> Export Transcript
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}