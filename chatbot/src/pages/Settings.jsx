import { useState, useEffect } from "react";
import { Shield, Bell, Globe, Trash2, User, AlertCircle, CheckCircle } from "lucide-react";
import {
  updateProfile,
  changePassword,
  getDomains,
  addDomain    as addDomainAPI,
  removeDomain as removeDomainAPI,
} from "../api/userService";

export default function Settings() {
  // ── State ──
  const [profile,   setProfile]   = useState({ fullname: "", email: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [domains,   setDomains]   = useState([]);
  const [newDomain, setNewDomain] = useState("");
  const [notifs,    setNotifs]    = useState({ newChat: true, dailyReport: false, weeklyReport: true });
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);

  // ── Toast helper ──
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load initial data ──
  useEffect(() => {
    (async () => {
      try {
        // Profile comes from localStorage (saved at login/register)
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          setProfile({ fullname: u.fullname || "", email: u.email || "" });
        }

        const domainsRes = await getDomains();
        if (domainsRes.success) setDomains(domainsRes.domains || []);
      } catch {
        showToast("error", "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Save Profile ──
  const saveProfile = async () => {
    try {
      const res = await updateProfile({ fullname: profile.fullname });
      if (res.success) {
        // Keep localStorage in sync so navbar/other components reflect the change
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...stored, fullname: profile.fullname }));
        showToast("success", "Profile updated.");
      } else {
        showToast("error", res.message || "Failed to update profile.");
      }
    } catch {
      showToast("error", "Network error.");
    }
  };

  // ── Change Password ──
  const savePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword)
      return showToast("error", "Please fill in all password fields.");
    if (passwords.newPassword !== passwords.confirm)
      return showToast("error", "New passwords do not match.");
    if (passwords.newPassword.length < 8)
      return showToast("error", "Password must be at least 8 characters.");
    try {
      const res = await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
      });
      if (res.success) {
        showToast("success", "Password changed.");
        setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
      } else {
        showToast("error", res.message || "Incorrect current password.");
      }
    } catch {
      showToast("error", "Network error.");
    }
  };

  // ── Add Domain ──
  const handleAddDomain = async () => {
    const d = newDomain.trim();
    if (!d) return;
    try {
      const res = await addDomainAPI(d);
      if (res.success) {
        setDomains(prev => [...prev, d]);
        setNewDomain("");
        showToast("success", "Domain added.");
      } else {
        showToast("error", res.message || "Failed to add domain.");
      }
    } catch {
      showToast("error", "Network error.");
    }
  };

  // ── Remove Domain ──
  const handleRemoveDomain = async (domain) => {
    try {
      const res = await removeDomainAPI(domain);
      if (res.success) {
        setDomains(prev => prev.filter(d => d !== domain));
        showToast("success", "Domain removed.");
      } else {
        showToast("error", "Failed to remove domain.");
      }
    } catch {
      showToast("error", "Network error.");
    }
  };

  // ── Delete Account ──
  const deleteAccount = () => {
    if (window.confirm("Are you absolutely sure? This cannot be undone.")) {
      showToast("error", "Account deletion is not yet implemented on the server.");
    }
  };

  // ── UI Helpers ──
  const Card = ({ children, title, icon }) => (
    <div className="rounded-xl p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#16161e] shadow-sm hover:shadow-md dark:shadow-none transition-all">
      {(title || icon) && (
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{icon}</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{title}</div>
        </div>
      )}
      {children}
    </div>
  );

  const Input = ({ label, disabled, ...props }) => (
    <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">{label}</label>
      <input
        disabled={disabled}
        className={`px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        {...props}
      />
    </div>
  );

  const Toggle = ({ on, onToggle }) => (
    <div onClick={onToggle} className="relative cursor-pointer w-11 h-6 shrink-0">
      <div className={`absolute inset-0 rounded-full transition-all duration-200 ${on ? "bg-indigo-500" : "bg-slate-200 dark:bg-white/10"}`} />
      <div className={`absolute top-1 rounded-full bg-white transition-all duration-200 shadow-sm ${on ? "left-[22px]" : "left-1"}`} style={{ width: 16, height: 16 }} />
    </div>
  );

  const SaveBtn = ({ onClick, label = "Save Changes" }) => (
    <button
      onClick={onClick}
      className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
      style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}
    >
      {label}
    </button>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading settings…</div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 transition-colors">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold
          ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure your workspace and account security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left Column ── */}
        <div className="flex flex-col gap-8">

          {/* Profile */}
          <Card title="Account Profile" icon={<User size={18} />}>
            <Input
              label="Full Name"
              value={profile.fullname}
              onChange={e => setProfile({ ...profile, fullname: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              value={profile.email}
              disabled
              title="Email cannot be changed"
            />
            <SaveBtn onClick={saveProfile} label="Update Profile" />
          </Card>

          {/* Security */}
          <Card title="Security" icon={<Shield size={18} />}>
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={passwords.currentPassword}
              onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="New Password"
                type="password"
                placeholder="8+ characters"
                value={passwords.newPassword}
                onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={passwords.confirm}
                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>
            <p className="mt-3 text-[10px] text-slate-500 italic">
              Changing your password will log you out of all other active sessions.
            </p>
            <SaveBtn onClick={savePassword} label="Change Password" />
          </Card>
        </div>

        {/* ── Right Column ── */}
        <div className="flex flex-col gap-8">

          {/* Notifications — UI only, no backend endpoint yet */}
          <Card title="Notifications" icon={<Bell size={18} />}>
            <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {[
                { key: "newChat",      label: "New Chat Alerts",  desc: "Instantly notify when a new visitor starts talking." },
                { key: "dailyReport",  label: "Daily Summaries",  desc: "A morning digest of your bot's performance." },
                { key: "weeklyReport", label: "Weekly Insights",  desc: "Deep dive analytics sent every Monday." },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="pr-4">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{n.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.desc}</div>
                  </div>
                  <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} />
                </div>
              ))}
            </div>
          </Card>

          {/* Allowed Domains */}
          <Card title="Allowed Domains" icon={<Globe size={18} />}>
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Strict Mode:</strong> Only the domains listed below will be able to load your chat widget using your public API key.
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {domains.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2">No domains added yet.</p>
              )}
              {domains.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] group">
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{d}</span>
                  <button
                    onClick={() => handleRemoveDomain(d)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                placeholder="app.yoursite.com"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddDomain()}
              />
              <button
                onClick={handleAddDomain}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10"
              >
                Add
              </button>
            </div>
          </Card>

          {/* Danger Zone */}
          <div className="rounded-xl p-6 border border-rose-200 dark:border-rose-500/15 bg-rose-50/30 dark:bg-rose-500/5 transition-colors">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-1 uppercase tracking-tight">Danger Zone</h3>
            <p className="text-[11px] text-slate-500 dark:text-rose-300/60 mb-5 leading-relaxed">
              Deleting your account will remove all chatbot configurations, logs, and analytics. This is irreversible.
            </p>
            <button
              onClick={deleteAccount}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 bg-white dark:bg-rose-500/10 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all"
            >
              <Trash2 size={14} /> Delete Account & Data
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}