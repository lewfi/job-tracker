import { useState, useEffect } from "react"
import api from "../api"

const STATUSES = ["applied", "screen", "onsite", "offer", "rejected", "withdrawn"]
const SOURCES = ["linkedin", "indeed", "company_website", "referral", "handshake", "other"]

function Applications() {
    const [applications, setApplications] = useState([])
    const [form, setForm] = useState({
        company: "",
        role: "",
        status: "applied",
        date_applied: "",
        source: "linkedin",
        location: "",
        salary_min: "",
        salary_max: "",
        notes: ""
    })
    const [error, setError] = useState("")

    const fetchApplications = () => {
        api.get("/applications")
            .then(res => setApplications(res.data))
    }

    useEffect(() => {
        fetchApplications()
    }, [])

    const handleSubmit = () => {
        if (!form.company || !form.role || !form.date_applied) {
            setError("Company, role, and date applied are required.")
            return
        }
        setError("")
        api.post("/applications", {
            ...form,
            salary_min: form.salary_min ? parseInt(form.salary_min) : null,
            salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        })
        .then(() => {
            fetchApplications()
            setForm({
                company: "", role: "", status: "applied",
                date_applied: "", source: "linkedin",
                location: "", salary_min: "", salary_max: "", notes: ""
            })
        })
        .catch(() => setError("Failed to create application. Check your inputs."))
    }

    const handleDelete = (id) => {
        api.delete(`/applications/${id}`)
            .then(() => fetchApplications())
    }

    const handleStatusChange = (id, newStatus) => {
        api.patch(`/applications/${id}`, { status: newStatus })
            .then(() => fetchApplications())
    }

    return (
        <div>
            <h3>Add Application</h3>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
                <input placeholder="Company *" value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })} />
                <input placeholder="Role *" value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })} />
                <input type="date" value={form.date_applied}
                    onChange={e => setForm({ ...form, date_applied: e.target.value })} />
                <select value={form.source}
                    onChange={e => setForm({ ...form, source: e.target.value })}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input placeholder="Location" value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })} />
                <input placeholder="Salary Min" type="number" value={form.salary_min}
                    onChange={e => setForm({ ...form, salary_min: e.target.value })} />
                <input placeholder="Salary Max" type="number" value={form.salary_max}
                    onChange={e => setForm({ ...form, salary_max: e.target.value })} />
                <input placeholder="Notes" value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    style={{ gridColumn: "span 2" }} />
            </div>
            <button onClick={handleSubmit}>Add Application</button>

            <h3 style={{ marginTop: "2rem" }}>Your Applications</h3>
            {applications.length === 0 ? (
                <p>No applications yet — add one above!</p>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Company", "Role", "Status", "Date Applied", "Source", "Location", "Actions"].map(h => (
                                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map(app => (
                            <tr key={app.id}>
                                <td style={{ padding: "0.5rem" }}>{app.company}</td>
                                <td style={{ padding: "0.5rem" }}>{app.role}</td>
                                <td style={{ padding: "0.5rem" }}>
                                    <select value={app.status}
                                        onChange={e => handleStatusChange(app.id, e.target.value)}>
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                                <td style={{ padding: "0.5rem" }}>{new Date(app.date_applied).toLocaleDateString()}</td>
                                <td style={{ padding: "0.5rem" }}>{app.source}</td>
                                <td style={{ padding: "0.5rem" }}>{app.location}</td>
                                <td style={{ padding: "0.5rem" }}>
                                    <button
                                        onClick={() => handleDelete(app.id)}
                                        style={{ color: "red", cursor: "pointer" }}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default Applications