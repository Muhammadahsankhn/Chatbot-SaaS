import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, isLoggedIn, logout } from "../api/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start — restore user from localStorage
  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getCurrentUser());
    }
    setLoading(false);
  }, []);

  // handleLogin sets user AND returns the updated user
  // Login.jsx awaits this before calling navigate()
  const handleLogin = (userData) => {
    setUser(userData);
    return userData;
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      handleLogin,
      handleLogout,
      isLoggedIn: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}