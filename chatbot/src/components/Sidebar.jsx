import { NavLink } from "react-router-dom";
import { LayoutDashboard, Key, Zap, Palette, MessageSquare, BarChart2, Settings, LogOut, Bot, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { logout } from "../api/authService";

const links = [
  { to: "/dashboard", icon: <LayoutDashboard size={17} />, label: "Dashboard" },
  { to: "/api-key", icon: <Key size={17} />, label: "API Key" },
  { to: "/widget-setup", icon: <Zap size={17} />, label: "Widget Setup" },
  { to: "/customization", icon: <Palette size={17} />, label: "Customization" },
  { to: "/chat-logs", icon: <MessageSquare size={17} />, label: "Chat Logs" },
  { to: "/analytics", icon: <BarChart2 size={17} />, label: "Analytics" },
  { to: "/settings", icon: <Settings size={17} />, label: "Settings" },
  { to: "/plans", icon: <Zap size={17} />, label: "Plans" },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user } = useAuth();

  const firstName = user?.fullname?.split(" ")[0] || "there";
  const email = user?.email || "email";
  const initial = user?.fullname?.charAt(0)?.toUpperCase() || "?";

  return (
    <>
      {/* BACKDROP: Closes sidebar when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-screen w-60 flex flex-col px-4 py-6 z-50 
        border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] transition-all duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-between px-2 pb-7 mb-4 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <Bot size={22} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-900 dark:text-white font-bold text-lg tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
              Digi Chat
            </span>
          </div>
          {/* Close button inside sidebar for mobile */}
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {links.map(link => (
            <NavLink 
              key={link.to} 
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive
                  ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / User */}
        <div className="border-t border-slate-200 dark:border-white/5 pt-4">
          <div className="flex items-center gap-2.5 px-3 pb-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
              {initial}
            </div>
            <div className="overflow-hidden">
              <div className="text-slate-900 dark:text-slate-200 text-sm font-medium leading-none truncate">{firstName}</div>
              <div className="text-slate-500 text-[10px] mt-1 truncate">{email}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400">
            <LogOut size={17} /><span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}