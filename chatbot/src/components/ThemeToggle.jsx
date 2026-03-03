import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-xl border transition-all 
                 border-slate-200 bg-white text-slate-500 hover:bg-slate-50 
                 dark:border-white/10 dark:bg-[#16161e] dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:hover:bg-white/5"
      aria-label="Toggle Theme"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}