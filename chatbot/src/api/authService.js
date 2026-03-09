import api from "./api";

// Register new user
export const register = async (fullname, email, password) => {
  const res = await api.post("/users/register", { fullname, email, password });
  return res.data;
};

// Login
export const login = async (email, password) => {
  const res = await api.post("/users/login", { email, password });

  console.log("backend response", res.data);

  // Save token and user info to localStorage
  if (res.data.token) {
    localStorage.setItem("cb_token", res.data.token);
    localStorage.setItem("cb_user", JSON.stringify(res.data.user));
  }

  return res.data;
};

// Logout
export const logout = () => {
  localStorage.removeItem("cb_token");
  localStorage.removeItem("cb_user");
  window.location.href = "/digichat/login";
};

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem("cb_user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

// Check if user is logged in
export const isLoggedIn = () => {
  return !!localStorage.getItem("cb_token");
};

// Get full profile from backend
export const getProfile = async () => {
  const res = await api.get("/users/profile");
  return res.data;
};