import { useState, useEffect } from "react"
import api from "../api"
import { COLORS, MONO, STATUSES, STATUS_LABELS } from "../theme"

function Pipeline({ refreshKey }) {
    const [data, setData] = useState(null)

    useEffect(() => {
        api.get("/analytics/pipeline")
            .then(res => setData(res.data))
    }, [refreshKey])

    if (!data) {
        return <div style={{ padding: "24px", fontFamily: MONO, fontSize: "12px", color: COLORS.muted }}>Loading…</div>
    }

    const counts = Object.fromEntries(data.map(row => [row.status, row.count]))
    const maxCount = Math.max(1, ...STATUSES.map(s => counts[s] ?? 0))

    return (
        <div style={{ padding: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em", marginBottom: "2px" }}>PIPELINE BREAKDOWN</div>
            <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "18px" }}>Applications by current stage</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                {STATUSES.map(status => {
                    const count = counts[status] ?? 0
                    const pct = Math.round((count / maxCount) * 100) + "%"
                    return (
                        <div key={status}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", fontFamily: MONO }}>
                                <span>{STATUS_LABELS[status].toUpperCase()}</span>
                                <span>{count}</span>
                            </div>
                            <div style={{ height: "8px", background: COLORS.bgLight }}>
                                <div style={{ height: "100%", width: pct, background: COLORS.accent }}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Pipeline
