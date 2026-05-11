import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogin } = useAuth();
  
  // Guard against infinite loops
  const hasProcessed = useRef(false);

  useEffect(() => {
    // If we've already started processing, do nothing
    if (hasProcessed.current) return;

    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const userStr = params.get("user");

    if (token && userStr) {
      hasProcessed.current = true; // Lock the effect
      
      try {
        const user = JSON.parse(userStr);

        // 1. Save to storage (using your 'cb_' keys)
        localStorage.setItem("cb_token", token);
        localStorage.setItem("cb_user", JSON.stringify(user));

        // 2. Update Context
        handleLogin(user);

        // 3. Move to dashboard
        // We use replace: true so the user can't "Go Back" into the loop
        navigate("/dashboard", { replace: true });
        
      } catch (err) {
        console.error("Auth error:", err);
        navigate("/login?error=sync_error", { replace: true });
      }
    }
  }, [handleLogin, location.search, navigate]); 

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080810]">
       <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );
}