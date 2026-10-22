import { useState, useEffect } from "react"
import api, { describeApiError } from "../api"
import { formatDate } from "../format"
import { COLORS, MONO, STATUS_META, STATUS_LABELS } from "../theme"

const gridCols = "1.6fr 1.6fr 1fr 1fr"
const COLLAPSED_KEY = "priorityCollapsed"

function readCollapsed() {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === "true"
    } catch {
        return false
    }
}

// Applications at technical/onsite/offer, plus anything manually starred.
// Ordering comes from the API (offer → onsite → technical → starred).
function Priority({ refreshKey }) {
    const [applications, setApplications] = useState([])
    const [error, setError] = useState("")
    // Remembered across reloads so a hidden list stays hidden
    const [collapsed, setCollapsed] = useState(readCollapsed)

    const toggleCollapsed = () => {
        const next = !collapsed
        setCollapsed(next)
        try {
            localStorage.setItem(COLLAPSED_KEY, String(next))
        } catch {
            // Storage unavailable; the toggle still works for this session
        }
    }

    useEffect(() => {
        api.get("/applications/priority")
            .then(res => {
                setApplications(res.data)
                setError("")
            })
            .catch(err => setError(describeApiError(err, "load priority applications")))
    }, [refreshKey])

    if (error) {
        return <div style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO, marginBottom: "16px" }}>{error}</div>
    }

    if (applications.length === 0) {
        return null
    }

    return (
        <div style={{ border: `1px solid ${COLORS.border}`, marginBottom: "24px" }}>
            <button onClick={toggleCollapsed} aria-expanded={!collapsed}
                style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px",
                    background: "none", border: "none", borderBottom: collapsed ? "none" : `1px solid ${COLORS.border}`,
                    cursor: "pointer", color: COLORS.dark, textAlign: "left",
                }}>
                <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".04em" }}>★ PRIORITY · {applications.length}</span>
                <span style={{ fontSize: "11px", color: COLORS.muted, fontFamily: MONO }}>{collapsed ? "SHOW ▾" : "HIDE ▴"}</span>
            </button>
            {!collapsed && applications.map((app, i) => {
                const meta = STATUS_META[app.status]
                return (
                    <div key={app.id} style={{
                        display: "grid", gridTemplateColumns: gridCols, gap: "14px", alignItems: "center",
                        padding: "11px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.bgLight}`,
                    }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{app.company}</div>
                        <div style={{ fontSize: "13px" }}>{app.role}</div>
                        <div>
                            <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}`, borderRadius: "2px", padding: "3px 8px", fontSize: "11px", fontWeight: 600, fontFamily: MONO }}>
                                {STATUS_LABELS[app.status].toUpperCase()}
                            </span>
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO }}>{formatDate(app.date_applied)}</div>
                    </div>
                )
            })}
        </div>
    )
}

export default Priority
