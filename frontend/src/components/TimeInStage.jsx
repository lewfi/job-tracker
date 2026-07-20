import { useState, useEffect } from "react"
import api from "../api"
import { COLORS, MONO, STATUS_LABELS, STATUS_META } from "../theme"

function formatDays(avgDays) {
    const hours = avgDays * 24
    if (hours < 1) {
        return "< 1 hour"
    }
    if (avgDays < 1) {
        return `${Math.round(hours)} hours`
    }
    return `${avgDays.toFixed(1)} days`
}

function TimeInStage({ refreshKey }) {
    const [data, setData] = useState(null)

    useEffect(() => {
        api.get("/analytics/time-in-stage")
            .then(res => setData(res.data))
    }, [refreshKey])

    if (!data) {
        return <div style={{ padding: "24px", fontFamily: MONO, fontSize: "12px", color: COLORS.muted }}>Loading…</div>
    }

    const maxDays = Math.max(1, ...data.map(row => row.avg_days))

    return (
        <div style={{ padding: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em", marginBottom: "2px" }}>AVG. TIME IN STAGE</div>
            <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "18px" }}>Days spent before moving to the next stage</div>
            {data.length === 0 ? (
                <div style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO }}>No completed transitions yet.</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                    {data.map(row => {
                        const pct = Math.max(Math.round((row.avg_days / maxDays) * 100), 4)
                        return (
                            <div key={row.stage}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", fontFamily: MONO }}>
                                    <span>{(STATUS_LABELS[row.stage] ?? row.stage).toUpperCase()}</span>
                                    <span>{formatDays(row.avg_days)}</span>
                                </div>
                                <div style={{ height: "8px", background: COLORS.bgLight }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: STATUS_META[row.stage]?.swatch ?? COLORS.accent }}></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default TimeInStage
