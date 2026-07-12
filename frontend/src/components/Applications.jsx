import { useState, useEffect, useMemo } from "react"
import api from "../api"

const STATUSES = ["applied", "screen", "onsite", "offer", "rejected", "withdrawn"]
const SOURCES = ["linkedin", "indeed", "company_website", "referral", "handshake", "other"]
const PAGE_SIZE = 10

const EMPTY_FORM = {
    company: "",
    role: "",
    status: "applied",
    date_applied: "",
    source: "linkedin",
    location: "",
    salary_min: "",
    salary_max: "",
    notes: ""
}

function toEditForm(app) {
    return {
        company: app.company ?? "",
        role: app.role ?? "",
        status: app.status ?? "applied",
        date_applied: app.date_applied ?? "",
        source: app.source ?? "linkedin",
        location: app.location ?? "",
        salary_min: app.salary_min ?? "",
        salary_max: app.salary_max ?? "",
        notes: app.notes ?? ""
    }
}

function Applications({ onDataChange }) {
    const [applications, setApplications] = useState([])
    const [form, setForm] = useState(EMPTY_FORM)
    const [error, setError] = useState("")

    const [statusFilter, setStatusFilter] = useState("all")
    const [sortField, setSortField] = useState("date_applied")
    const [sortDir, setSortDir] = useState("desc")
    const [page, setPage] = useState(1)

    const [editingApp, setEditingApp] = useState(null)
    const [editForm, setEditForm] = useState(null)
    const [editError, setEditError] = useState("")

    const fetchApplications = () => {
        api.get("/applications/")
            .then(res => setApplications(res.data))
    }

    useEffect(() => {
        fetchApplications()
    }, [])

    const notifyChange = () => {
        fetchApplications()
        onDataChange?.()
    }

    const handleSubmit = () => {
        if (!form.company || !form.role || !form.date_applied) {
            setError("Company, role, and date applied are required.")
            return
        }
        setError("")
        api.post("/applications/", {
            ...form,
            salary_min: form.salary_min ? parseInt(form.salary_min) : null,
            salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        })
        .then(() => {
            notifyChange()
            setForm(EMPTY_FORM)
        })
        .catch(() => setError("Failed to create application. Check your inputs."))
    }

    const handleDelete = (id) => {
        api.delete(`/applications/${id}`)
            .then(() => notifyChange())
    }

    const handleStatusChange = (id, newStatus) => {
        api.patch(`/applications/${id}`, { status: newStatus })
            .then(() => notifyChange())
    }

    const openEditModal = (app) => {
        setEditingApp(app)
        setEditForm(toEditForm(app))
        setEditError("")
    }

    const closeEditModal = () => {
        setEditingApp(null)
        setEditForm(null)
        setEditError("")
    }

    const handleEditSave = () => {
        if (!editForm.company || !editForm.role || !editForm.date_applied) {
            setEditError("Company, role, and date applied are required.")
            return
        }
        api.patch(`/applications/${editingApp.id}`, {
            ...editForm,
            salary_min: editForm.salary_min ? parseInt(editForm.salary_min) : null,
            salary_max: editForm.salary_max ? parseInt(editForm.salary_max) : null,
        })
        .then(() => {
            notifyChange()
            closeEditModal()
        })
        .catch(() => setEditError("Failed to update application. Check your inputs."))
    }

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(dir => dir === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDir("asc")
        }
        setPage(1)
    }

    const handleStatusFilterChange = (value) => {
        setStatusFilter(value)
        setPage(1)
    }

    const visibleApplications = useMemo(() => {
        let result = applications
        if (statusFilter !== "all") {
            result = result.filter(app => app.status === statusFilter)
        }
        result = [...result].sort((a, b) => {
            const aVal = a[sortField] ?? ""
            const bVal = b[sortField] ?? ""
            if (aVal < bVal) return sortDir === "asc" ? -1 : 1
            if (aVal > bVal) return sortDir === "asc" ? 1 : -1
            return 0
        })
        return result
    }, [applications, statusFilter, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(visibleApplications.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const pagedApplications = visibleApplications.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    )

    const sortIndicator = (field) => sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : ""

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

            <div style={{ marginBottom: "1rem" }}>
                <label>
                    Filter by status:{" "}
                    <select value={statusFilter} onChange={e => handleStatusFilterChange(e.target.value)}>
                        <option value="all">All</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </label>
            </div>

            {applications.length === 0 ? (
                <p>No applications yet — add one above!</p>
            ) : visibleApplications.length === 0 ? (
                <p>No applications match the selected filter.</p>
            ) : (
                <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem", cursor: "pointer" }}
                                    onClick={() => toggleSort("company")}>
                                    Company{sortIndicator("company")}
                                </th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem" }}>Role</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem" }}>Status</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem", cursor: "pointer" }}
                                    onClick={() => toggleSort("date_applied")}>
                                    Date Applied{sortIndicator("date_applied")}
                                </th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem" }}>Source</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem" }}>Location</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.5rem" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedApplications.map(app => (
                                <tr key={app.id} onClick={() => openEditModal(app)} style={{ cursor: "pointer" }}>
                                    <td style={{ padding: "0.5rem" }}>{app.company}</td>
                                    <td style={{ padding: "0.5rem" }}>{app.role}</td>
                                    <td style={{ padding: "0.5rem" }} onClick={e => e.stopPropagation()}>
                                        <select value={app.status}
                                            onChange={e => handleStatusChange(app.id, e.target.value)}>
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: "0.5rem" }}>{new Date(app.date_applied).toLocaleDateString()}</td>
                                    <td style={{ padding: "0.5rem" }}>{app.source}</td>
                                    <td style={{ padding: "0.5rem" }}>{app.location}</td>
                                    <td style={{ padding: "0.5rem" }} onClick={e => e.stopPropagation()}>
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

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                        <button disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                    </div>
                </>
            )}

            {editingApp && (
                <div
                    onClick={closeEditModal}
                    style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 1000
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: "white", color: "black", padding: "1.5rem",
                            borderRadius: "8px", width: "90%", maxWidth: "500px"
                        }}
                    >
                        <h3>Edit Application</h3>
                        {editError && <p style={{ color: "red" }}>{editError}</p>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
                            <input placeholder="Company *" value={editForm.company}
                                onChange={e => setEditForm({ ...editForm, company: e.target.value })} />
                            <input placeholder="Role *" value={editForm.role}
                                onChange={e => setEditForm({ ...editForm, role: e.target.value })} />
                            <input type="date" value={editForm.date_applied}
                                onChange={e => setEditForm({ ...editForm, date_applied: e.target.value })} />
                            <select value={editForm.source}
                                onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
                                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={editForm.status}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input placeholder="Location" value={editForm.location}
                                onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
                            <input placeholder="Salary Min" type="number" value={editForm.salary_min}
                                onChange={e => setEditForm({ ...editForm, salary_min: e.target.value })} />
                            <input placeholder="Salary Max" type="number" value={editForm.salary_max}
                                onChange={e => setEditForm({ ...editForm, salary_max: e.target.value })} />
                            <input placeholder="Notes" value={editForm.notes}
                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                style={{ gridColumn: "span 2" }} />
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button onClick={closeEditModal}>Cancel</button>
                            <button onClick={handleEditSave}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Applications
