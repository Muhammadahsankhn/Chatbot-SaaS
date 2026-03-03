import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // We default to true because you already built a beautiful dark UI!
  const [isDark, setIsDark] = useState(true); 

  useEffect(() => {
    // 1. Check if they have a saved preference in localStorage
    const savedTheme = localStorage.getItem("cb_theme");
    
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("cb_theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("cb_theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use anywhere
export const useTheme = () => useContext(ThemeContext);