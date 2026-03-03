import api from "./api";

// Get user's API key
export const getApiKey = async () => {
  const res = await api.get("/users/api-key");
  return res.data;
};

// Regenerate API key
export const regenerateApiKey = async () => {
  const res = await api.post("/users/api-key/regenerate");
  return res.data;
};

// Get dashboard stats
// Returns: totalConversations, totalMessages, activeToday, messageCount, plan, usageLimit
export const getDashboardStats = async () => {
  const res = await api.get("/users/stats");
  return res.data;
};

// Get recent conversations
export const getRecentConversations = async (limit = 10) => {
  const res = await api.get(`/users/conversations?limit=${limit}`);
  return res.data;
};

// Save widget configuration
// config: { botName, welcomeMessage, color, position, theme, systemPrompt }
export const saveWidgetConfig = async (config) => {
  const res = await api.put("/users/widget-config", config);
  return res.data;
};

// Get widget configuration
export const getWidgetConfig = async () => {
  const res = await api.get("/users/widget-config");
  return res.data;
};

// Add allowed domain
export const addDomain = async (domain) => {
  const res = await api.post("/users/domains", { domain });
  return res.data;
};

// Remove allowed domain
export const removeDomain = async (domain) => {
  const res = await api.delete("/users/domains", { data: { domain } });
  return res.data;
};

// Get all allowed domains
export const getDomains = async () => {
  const res = await api.get("/users/domains");
  return res.data;
};