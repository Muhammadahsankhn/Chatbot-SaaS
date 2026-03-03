import { useState } from "react";
import { Shield, Bell, Globe, Trash2, User, Key, Mail } from "lucide-react";

export default function Settings() {
  const [profile, setProfile] = useState({ name: "John Doe", email: "john@example.com", company: "Acme Corp" });
  const [notifs, setNotifs] = useState({ newChat: true, dailyReport: false, weeklyReport: true });
  const [domains, setDomains] = useState(["mywebsite.com", "staging.mywebsite.com"]);
  const [newDomain, setNewDomain] = useState("");
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const Card = ({ children, title, icon, borderClass = "" }) => (
    <div className={`rounded-xl p-6 border transition-all bg-white dark:bg-[#16161e] shadow-sm hover:shadow-md dark:shadow-none ${borderClass || "border-slate-200 dark:border-white/5"}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{title}</div>
        </div>
      )}
      {children}
    </div>
  );

  const Input = ({ label, ...props }) => (
    <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">{label}</label>
      <input 
        className="px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
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

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure your workspace and account security.</p>
        </div>
        <button onClick={save} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
          style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
          {saved ? "✓ Changes Saved" : "Save Settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Identity & Access */}
        <div className="flex flex-col gap-8">
          <Card title="Account Profile" icon={<User size={18} />}>
            <div className="space-y-4">
              <Input label="Full Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
              <Input label="Email Address" type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
              <Input label="Company Name" value={profile.company} onChange={e => setProfile({...profile, company: e.target.value})} />
            </div>
          </Card>

          <Card title="Security" icon={<Shield size={18} />}>
            <Input label="Current Password" type="password" placeholder="••••••••" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input label="New Password" type="password" placeholder="8+ characters" />
              <Input label="Confirm New Password" type="password" placeholder="••••••••" />
            </div>
            <p className="mt-4 text-[10px] text-slate-500 italic">Changing your password will log you out of all other active sessions.</p>
          </Card>
        </div>

        {/* Right Column: Notifications & Domains */}
        <div className="flex flex-col gap-8">
          <Card title="Notifications" icon={<Bell size={18} />}>
            <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {[
                { key: "newChat", label: "New Chat Alerts", desc: "Instantly notify when a new visitor starts talking." },
                { key: "dailyReport", label: "Daily Summaries", desc: "A morning digest of your bot's performance." },
                { key: "weeklyReport", label: "Weekly Insights", desc: "Deep dive analytics sent every Monday." },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="pr-4">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{n.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.desc}</div>
                  </div>
                  <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({...p, [n.key]: !p[n.key]}))} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Allowed Domains" icon={<Globe size={18} />}>
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Strict Mode:</strong> Only the domains listed below will be able to load your chat widget using your public API key.
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
              {domains.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] group">
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{d}</span>
                  <button onClick={() => setDomains(domains.filter((_, j) => j !== i))}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                placeholder="app.yoursite.com" value={newDomain} onChange={e => setNewDomain(e.target.value)} />
              <button onClick={() => { if(newDomain.trim()){setDomains([...domains, newDomain.trim()]); setNewDomain("");} }}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10">
                Add
              </button>
            </div>
          </Card>

          {/* Danger Zone */}
          <div className="rounded-xl p-6 border border-rose-200 dark:border-rose-500/15 bg-rose-50/30 dark:bg-rose-500/5 transition-colors">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-1 uppercase tracking-tight">Danger Zone</h3>
            <p className="text-[11px] text-slate-500 dark:text-rose-300/60 mb-5 leading-relaxed">Deleting your account will remove all chatbot configurations, logs, and analytics. This is irreversible.</p>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 bg-white dark:bg-rose-500/10 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all">
              <Trash2 size={14}/> Delete Account & Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}