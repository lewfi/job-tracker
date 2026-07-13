import { useState } from "react"
import api from "../api"
import { COLORS, MONO } from "../theme"

const inputStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "12px",
    fontSize: "13.5px",
    width: "100%",
}

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
        <div style={{ border: `1px solid ${COLORS.border}`, padding: "28px" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em", marginBottom: "18px" }}>LOG IN</div>
            {error && <p style={{ fontSize: "12px", color: COLORS.error, fontFamily: MONO }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                <input placeholder="Email" type="email" value={form.email} style={inputStyle}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                <input placeholder="Password" type="password" value={form.password} style={inputStyle}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button onClick={handleSubmit} style={{
                width: "100%", background: COLORS.accent, color: "#fff", border: "none",
                padding: "12px", borderRadius: "2px", fontSize: "13px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em",
            }}>LOG IN</button>
            <p style={{ fontSize: "13px", color: COLORS.muted, marginTop: "16px", textAlign: "center" }}>
                Don't have an account?{" "}
                <a href="#" onClick={e => { e.preventDefault(); onSwitchToRegister() }} style={{ color: COLORS.accent }}>Register</a>
            </p>
        </div>
    )
}

export default Login
