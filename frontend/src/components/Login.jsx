import { useState } from "react"
import api from "../api"

function Login({ onAuthSuccess, onSwitchToRegister }) {
    const [form, setForm] = useState({ email: "", password: "" })
    const [error, setError] = useState("")

    const handleSubmit = () => {
        if (!form.email || !form.password) {
            setError("Email and password are required.")
            return
        }
        setError("")
        api.post("/auth/login", form)
            .then(res => onAuthSuccess(res.data.email, res.data.access_token))
            .catch(() => setError("Invalid email or password."))
    }

    return (
        <div>
            <h2>Log In</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
                <input placeholder="Email" type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                <input placeholder="Password" type="password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button onClick={handleSubmit}>Log In</button>
            <p>
                Don't have an account?{" "}
                <a href="#" onClick={e => { e.preventDefault(); onSwitchToRegister() }}>Register</a>
            </p>
        </div>
    )
}

export default Login
