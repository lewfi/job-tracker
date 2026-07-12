import { useState } from "react"
import api from "../api"

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
        <div>
            <h2>Register</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
                <input placeholder="Email" type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                <input placeholder="Password" type="password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button onClick={handleSubmit}>Create Account</button>
            <p>
                Already have an account?{" "}
                <a href="#" onClick={e => { e.preventDefault(); onSwitchToLogin() }}>Log In</a>
            </p>
        </div>
    )
}

export default Register
