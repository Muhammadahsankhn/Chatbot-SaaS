import axios from "axios";



// Single source of truth for the backend URL

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";



const api = axios.create({

    baseURL: BASE_URL,

    withCredentials: true,

    headers: { "Content-Type": "application/json" },

});



// Attach JWT token to every request automatically 

api.interceptors.request.use((config) => {

    const token = localStorage.getItem("cb_token");

    if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;

});



// If token expired (401), log user out automatically

api.interceptors.response.use(

    (response) => response,

    (error) => {

        if (error.response?.status === 401) {

            console.error("THE BACKEND REJECTED THE TOKEN! (401 Unauthorized)");

            localStorage.removeItem("cb_token");

            localStorage.removeItem("cb_user");



            // Only redirect if NOT on the login page already

            if (window.location.pathname !== "/digichat/login") {

                window.location.href = "/digichat/login";

            }

        }

        return Promise.reject(error);

    }

);





export default api;