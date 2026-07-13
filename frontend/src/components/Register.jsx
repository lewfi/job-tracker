import { useState } from "react"
import api from "../api"
import { COLORS, MONO } from "../theme"

const inputStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "10px 12px",
    fontSize: "13.5px",
    width: "100%",
}

function Register({ onAuthSuccess, onSwitchToLogin }) {
    const [form, setForm] = useState({ email: "", password: "" })
    const [error, setError] = useState("")

    const handleSubmit = () => {
        if (!form.email || !form.password) {
            setError("Email and password are required.")
            return
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.")
            return
        }
        setError("")
        api.post("/auth/register", form)
            .then(res => onAuthSuccess(res.data.email, res.data.access_token))
            .catch(err => setError(
                err.response?.status === 409
                    ? "That email is already registered."
                    : "Registration failed. Check your inputs."
            ))
    }

    return (
        <div style={{ border: `1px solid ${COLORS.border}`, padding: "28px" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em", marginBottom: "18px" }}>REGISTER</div>
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
            }}>CREATE ACCOUNT</button>
            <p style={{ fontSize: "13px", color: COLORS.muted, marginTop: "16px", textAlign: "center" }}>
                Already have an account?{" "}
                <a href="#" onClick={e => { e.preventDefault(); onSwitchToLogin() }} style={{ color: COLORS.accent }}>Log In</a>
            </p>
        </div>
    )
}

export default Register
