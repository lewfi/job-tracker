import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react"
import api from "../api"
import ApplicationDrawer from "./ApplicationDrawer"
import { COLORS, MONO, STATUSES, STATUS_META, STATUS_LABELS } from "../theme"

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

function formatDate(dateStr) {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day).toLocaleDateString()
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

const gridCols = "1.6fr 1.6fr 1fr 1fr 1.2fr 130px 40px"

const headerLabelStyle = {
    fontSize: "11px", fontWeight: 600, fontFamily: MONO, color: COLORS.muted, letterSpacing: ".03em",
}

const Applications = forwardRef(function Applications({ onDataChange }, ref) {
    const [applications, setApplications] = useState([])

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [sortField, setSortField] = useState("date_applied")
    const [sortDir, setSortDir] = useState("desc")
    const [page, setPage] = useState(1)

    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [editingApp, setEditingApp] = useState(null)
    const [openMenuId, setOpenMenuId] = useState(null)

    const fetchApplications = () => {
        api.get("/applications/")
            .then(res => setApplications(res.data))
    }

    useEffect(() => {
        fetchApplications()
    }, [])

    useImperativeHandle(ref, () => ({
        openAddDrawer: () => setAddDrawerOpen(true),
    }))

    const notifyChange = () => {
        fetchApplications()
        onDataChange?.()
    }

    const handleAdd = (formValues) => {
        if (!formValues.company || !formValues.role || !formValues.date_applied) {
            return Promise.reject("Company, role, and date applied are required.")
        }
        return api.post("/applications/", {
            ...formValues,
            salary_min: formValues.salary_min ? parseInt(formValues.salary_min) : null,
            salary_max: formValues.salary_max ? parseInt(formValues.salary_max) : null,
        })
            .then(() => {
                notifyChange()
                setAddDrawerOpen(false)
            })
            .catch(() => Promise.reject("Failed to create application. Check your inputs."))
    }

    const handleEditSubmit = (formValues) => {
        if (!formValues.company || !formValues.role || !formValues.date_applied) {
            return Promise.reject("Company, role, and date applied are required.")
        }
        return api.patch(`/applications/${editingApp.id}`, {
            ...formValues,
            salary_min: formValues.salary_min ? parseInt(formValues.salary_min) : null,
            salary_max: formValues.salary_max ? parseInt(formValues.salary_max) : null,
        })
            .then(() => {
                notifyChange()
                setEditingApp(null)
            })
            .catch(() => Promise.reject("Failed to update application. Check your inputs."))
    }

    const handleDelete = (id) => {
        api.delete(`/applications/${id}`)
            .then(() => notifyChange())
        setOpenMenuId(null)
    }

    const handleStatusChange = (id, newStatus) => {
        api.patch(`/applications/${id}`, { status: newStatus })
            .then(() => notifyChange())
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

    const handleSearchChange = (value) => {
        setSearch(value)
        setPage(1)
    }

    const clearFilters = () => {
        setStatusFilter("all")
        setSearch("")
        setPage(1)
    }

    const visibleApplications = useMemo(() => {
        let result = applications
        if (statusFilter !== "all") {
            result = result.filter(app => app.status === statusFilter)
        }
        const searchLower = search.trim().toLowerCase()
        if (searchLower) {
            result = result.filter(app =>
                app.company.toLowerCase().includes(searchLower) || app.role.toLowerCase().includes(searchLower)
            )
        }
        result = [...result].sort((a, b) => {
            const aVal = a[sortField] ?? ""
            const bVal = b[sortField] ?? ""
            if (aVal < bVal) return sortDir === "asc" ? -1 : 1
            if (aVal > bVal) return sortDir === "asc" ? 1 : -1
            return 0
        })
        return result
    }, [applications, statusFilter, search, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(visibleApplications.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const pagedApplications = visibleApplications.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    )

    const sortIndicator = (field) => sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : ""

    const totalCount = applications.length
    const activeCount = applications.filter(a => !["rejected", "withdrawn"].includes(a.status)).length
    const offerCount = applications.filter(a => a.status === "offer").length

    const noAppsAtAll = totalCount === 0
    const noResults = !noAppsAtAll && visibleApplications.length === 0

    return (
        <div>
            {/* summary strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: `1px solid ${COLORS.border}`, marginBottom: "24px" }}>
                <div style={{ padding: "18px 22px", borderRight: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: "11px", fontFamily: MONO, color: COLORS.muted, letterSpacing: ".04em", marginBottom: "6px" }}>TOTAL APPLICATIONS</div>
                    <div style={{ fontSize: "26px", fontWeight: 600, fontFamily: MONO }}>{totalCount}</div>
                </div>
                <div style={{ padding: "18px 22px", borderRight: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: "11px", fontFamily: MONO, color: COLORS.muted, letterSpacing: ".04em", marginBottom: "6px" }}>ACTIVE</div>
                    <div style={{ fontSize: "26px", fontWeight: 600, fontFamily: MONO, color: COLORS.accent }}>{activeCount}</div>
                </div>
                <div style={{ padding: "18px 22px" }}>
                    <div style={{ fontSize: "11px", fontFamily: MONO, color: COLORS.muted, letterSpacing: ".04em", marginBottom: "6px" }}>OFFERS</div>
                    <div style={{ fontSize: "26px", fontWeight: 600, fontFamily: MONO }}>{offerCount}</div>
                </div>
            </div>

            {/* filter bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "280px" }}>
                    <input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Search company or role…"
                        style={{ flex: 1, maxWidth: "320px", border: `1px solid ${COLORS.border}`, borderRadius: "2px", padding: "9px 12px", fontSize: "13px" }} />
                    <select value={statusFilter} onChange={e => handleStatusFilterChange(e.target.value)}
                        style={{ border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: "2px", padding: "9px 10px", fontSize: "12.5px", fontFamily: MONO }}>
                        <option value="all">ALL STATUSES</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>
                <span style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO, whiteSpace: "nowrap" }}>
                    {visibleApplications.length} OF {totalCount}
                </span>
            </div>

            {noAppsAtAll && (
                <div style={{ border: `1px dashed ${COLORS.border}`, padding: "64px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, fontFamily: MONO, marginBottom: "6px" }}>No applications yet</div>
                    <div style={{ fontSize: "13.5px", color: COLORS.muted, marginBottom: "20px" }}>Add your first application to start tracking your pipeline.</div>
                    <button onClick={() => setAddDrawerOpen(true)} style={{ background: COLORS.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: "2px", fontSize: "13px", fontWeight: 600, fontFamily: MONO }}>ADD APPLICATION</button>
                </div>
            )}

            {noResults && (
                <div style={{ border: `1px dashed ${COLORS.border}`, padding: "64px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, fontFamily: MONO, marginBottom: "6px" }}>No applications match your search</div>
                    <div style={{ fontSize: "13.5px", color: COLORS.muted, marginBottom: "20px" }}>Try a different status or search term.</div>
                    <button onClick={clearFilters} style={{ background: COLORS.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: "2px", fontSize: "13px", fontWeight: 600, fontFamily: MONO }}>CLEAR FILTERS</button>
                </div>
            )}

            {!noAppsAtAll && !noResults && (
                <div>
                    <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "14px", padding: "0 4px 10px", borderBottom: `1px solid ${COLORS.border}` }}>
                        <div style={{ ...headerLabelStyle, cursor: "pointer" }} onClick={() => toggleSort("company")}>COMPANY{sortIndicator("company")}</div>
                        <div style={headerLabelStyle}>ROLE / LOCATION</div>
                        <div style={headerLabelStyle}>SOURCE</div>
                        <div style={{ ...headerLabelStyle, cursor: "pointer" }} onClick={() => toggleSort("date_applied")}>DATE{sortIndicator("date_applied")}</div>
                        <div style={headerLabelStyle}>STATUS</div>
                        <div></div>
                        <div></div>
                    </div>

                    {pagedApplications.map(app => {
                        const meta = STATUS_META[app.status]
                        return (
                            <div key={app.id} onClick={() => setEditingApp(app)}
                                style={{ display: "grid", gridTemplateColumns: gridCols, gap: "14px", alignItems: "center", padding: "16px 4px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
                                <div style={{ fontSize: "14px", fontWeight: 600 }}>{app.company}</div>
                                <div>
                                    <div style={{ fontSize: "13px" }}>{app.role}</div>
                                    <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "2px" }}>{app.location || "—"}</div>
                                </div>
                                <div style={{ fontSize: "12px", color: COLORS.muted, textTransform: "uppercase", fontFamily: MONO }}>{app.source}</div>
                                <div style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO }}>{formatDate(app.date_applied)}</div>
                                <div onClick={e => e.stopPropagation()}>
                                    <select value={app.status} onChange={e => handleStatusChange(app.id, e.target.value)}
                                        style={{ border: `1px solid ${meta.color}`, background: meta.bg, color: meta.color, borderRadius: "2px", padding: "5px 8px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", fontFamily: MONO }}>
                                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s].toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                                    {openMenuId === app.id && (
                                        <button onClick={() => handleDelete(app.id)}
                                            style={{ background: COLORS.dark, color: "#fff", border: "none", borderRadius: "2px", padding: "7px 12px", fontSize: "11px", fontWeight: 600, fontFamily: MONO }}>
                                            CONFIRM DELETE
                                        </button>
                                    )}
                                </div>
                                <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === app.id ? null : app.id) }}
                                    style={{ background: "none", border: "none", color: COLORS.dark, fontSize: "16px", padding: "4px 8px", justifySelf: "end" }}>···</button>
                            </div>
                        )
                    })}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px" }}>
                        <button disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}
                            style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: "2px", padding: "8px 14px", fontSize: "12px", fontFamily: MONO, color: COLORS.muted }}>PREV</button>
                        <span style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO }}>PAGE {currentPage} OF {totalPages}</span>
                        <button disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}
                            style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: "2px", padding: "8px 14px", fontSize: "12px", fontFamily: MONO, color: COLORS.muted }}>NEXT</button>
                    </div>
                </div>
            )}

            {addDrawerOpen && (
                <ApplicationDrawer
                    title="ADD APPLICATION"
                    submitLabel="ADD"
                    initialForm={EMPTY_FORM}
                    onClose={() => setAddDrawerOpen(false)}
                    onSubmit={handleAdd}
                />
            )}

            {editingApp && (
                <ApplicationDrawer
                    key={editingApp.id}
                    title="EDIT APPLICATION"
                    submitLabel="SAVE"
                    initialForm={toEditForm(editingApp)}
                    onClose={() => setEditingApp(null)}
                    onSubmit={handleEditSubmit}
                />
            )}
        </div>
    )
})

export default Applications
