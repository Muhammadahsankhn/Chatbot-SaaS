import api from "./api";

export const getApiKey        = ()      => api.get("/users/api-key").then(r => r.data);
export const regenerateApiKey = ()      => api.post("/users/api-key/regenerate").then(r => r.data);

export const getDashboardStats      = ()        => api.get("/users/stats").then(r => r.data);
export const getRecentConversations = (limit=4) => api.get(`/users/conversations?limit=${limit}`).then(r => r.data);
export const getWeeklyActivity      = ()        => api.get("/users/weekly-activity").then(r => r.data);

export const saveWidgetConfig = (config)   => api.put("/users/widget-config", config).then(r => r.data);
export const getWidgetConfig  = ()         => api.get("/users/widget-config").then(r => r.data);

export const addDomain    = (domain) => api.post("/users/domains", { domain }).then(r => r.data);
export const removeDomain = (domain) => api.delete("/users/domains", { data: { domain } }).then(r => r.data);
export const getDomains   = ()       => api.get("/users/domains").then(r => r.data);

export const updateProfile  = (data)     => api.put("/users/profile", data).then(r => r.data);
export const changePassword = (data)     => api.put("/users/password", data).then(r => r.data);
export const getAllChats     = (params)   => api.get("/users/all-conversations", { params }).then(r => r.data);
export const getAnalytics   = ()         => api.get("/users/analytics").then(r => r.data);