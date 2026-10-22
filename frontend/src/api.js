import axios from "axios"

const api = axios.create({
    // VITE_API_URL is set in .env.development to hit the local Docker API
    // (port 8000). It's unset in production, so this falls back to the
    // Render deployment.
    baseURL: import.meta.env.VITE_API_URL || "https://job-tracker-ezbr.onrender.com"
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

function formatValidationDetail(detail) {
    if (typeof detail === "string") return detail
    if (Array.isArray(detail) && detail.length) {
        return detail.map(d => `${d.loc?.[d.loc.length - 1] ?? "field"}: ${d.msg}`).join("; ")
    }
    return "check your inputs."
}

// Turns an axios error into a message that names the actual failure, so a
// cold start or network blip isn't reported as bad input. `action` completes
// "Couldn't ___", e.g. "create the application".
export function describeApiError(error, action) {
    const response = error?.response
    if (!response) {
        // No response at all: network failure, timeout, or Render's free tier
        // spinning the container back up. (An unhandled 500 also lands here in
        // the browser, because it comes back without CORS headers.)
        return `Couldn't reach the server — it may be waking up, which can take up to a minute. Try again.`
    }
    const { status, data } = response
    if (status === 401) return "Your session has expired. Please log in again."
    if (status === 404) return `Couldn't ${action}: it no longer exists. Refresh the page.`
    if (status === 422) return `Couldn't ${action}: ${formatValidationDetail(data?.detail)}`
    if (status >= 500) return `Server error while trying to ${action}. Try again in a moment.`
    return `Couldn't ${action} (error ${status}).`
}

export default api
