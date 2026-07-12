import axios from "axios"

const api = axios.create({
    baseURL: "https://job-tracker-production-23d0.up.railway.app"
})

export default api