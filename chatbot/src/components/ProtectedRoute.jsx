import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Check storage directly to bridge the gap while React state updates
  const hasToken = !!localStorage.getItem("cb_token");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Only redirect if both state AND storage say "no user"
  if (!user && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}