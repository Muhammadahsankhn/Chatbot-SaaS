import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }  from "./context/AuthContext";
import ProtectedRoute    from "./components/ProtectedRoute";
import AuthCallback      from "./pages/AuthCallback";
import { useState } from "react";
import { Menu, Bot } from "lucide-react";

import Sidebar       from "./components/Sidebar";
import Login         from "./pages/Login";
import Dashboard     from "./pages/Dashboard";
import ApiKey        from "./pages/ApiKey";
import WidgetSetup   from "./pages/WidgetSetup";
import Customization from "./pages/Customization";
import ChatLogs      from "./pages/ChatLogs";
import Analytics     from "./pages/Analytics";
import Settings      from "./pages/Settings";
import Plans         from "./pages/Plans";
import Preloader     from "./components/Preloader";

function Layout({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f0f13] transition-colors duration-300">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-5 h-16 bg-white dark:bg-[#16161e] border-b border-slate-200 dark:border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Bot size={22} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-900 dark:text-white font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>
              Digi Chat
            </span>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400"
          >
            <Menu size={20} />
          </button>
        </header>

        <main className="flex-1 w-full lg:pl-64 xl:pl-72 p-6 md:p-10 lg:py-12 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  const [preloaderDone, setPreloaderDone] = useState(false);

  return (
    <>
      {/* ── Preloader — shows on every fresh page load ── */}
      {!preloaderDone && (
        <Preloader onComplete={() => setPreloaderDone(true)} />
      )}

      {/* ── Main app — renders underneath, visible after preloader exits ── */}
      <div style={{ opacity: preloaderDone ? 1 : 0, transition: "opacity 0.4s ease" }}>
        <AuthProvider>
          <BrowserRouter basename="/digichat">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
            <Routes>
              {/* Public */}
              <Route path="/login"         element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Root */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Protected */}
              <Route path="/dashboard"     element={<ProtectedLayout><Dashboard     /></ProtectedLayout>} />
              <Route path="/api-key"       element={<ProtectedLayout><ApiKey        /></ProtectedLayout>} />
              <Route path="/widget-setup"  element={<ProtectedLayout><WidgetSetup   /></ProtectedLayout>} />
              <Route path="/customization" element={<ProtectedLayout><Customization /></ProtectedLayout>} />
              <Route path="/chat-logs"     element={<ProtectedLayout><ChatLogs      /></ProtectedLayout>} />
              <Route path="/analytics"     element={<ProtectedLayout><Analytics     /></ProtectedLayout>} />
              <Route path="/settings"      element={<ProtectedLayout><Settings      /></ProtectedLayout>} />
              <Route path="/plans"         element={<ProtectedLayout><Plans         /></ProtectedLayout>} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </div>
    </>
  );
}