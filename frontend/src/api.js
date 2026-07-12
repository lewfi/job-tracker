import axios from "axios"

const api = axios.create({
    baseURL: "https://job-tracker-production-23d0.up.railway.app"
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
