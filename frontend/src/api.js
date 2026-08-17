import axios from "axios"

const api = axios.create({
    // VITE_API_URL is set in .env.development to hit the local Docker API
    // directly (cross-origin, port 8000). It's unset in production/preview,
    // so this falls back to "/api" — a same-origin request that vercel.json
    // rewrites to the Python function, avoiding a hardcoded domain.
    baseURL: import.meta.env.VITE_API_URL || "/api"
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthEndpoint = error.config?.url?.startsWith("/auth/")
        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem("token")
            localStorage.removeItem("userEmail")
            window.location.reload()
        }
        return Promise.reject(error)
    }
)

export default api
