import { useState, useEffect } from "react"
import api from "../api"
import { COLORS, MONO } from "../theme"

function formatWeekLabel(iso) {
    const [, m, d] = iso.split("-")
    if (!m || !d) return iso
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`
}

function Weekly({ refreshKey }) {
    const [data, setData] = useState(null)

    useEffect(() => {
        api.get("/analytics/weekly")
            .then(res => setData(res.data))
    }, [refreshKey])

    if (!data) {
        return <div style={{ padding: "24px", fontFamily: MONO, fontSize: "12px", color: COLORS.muted }}>Loading…</div>
    }

    const maxCount = Math.max(1, ...data.map(row => row.count))

    return (
        <div style={{ padding: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em", marginBottom: "2px" }}>WEEKLY VOLUME</div>
            <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "18px" }}>Applications submitted per week</div>
            {data.length === 0 ? (
                <div style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO }}>No data yet.</div>
            ) : (
                <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "120px", borderBottom: `1px solid ${COLORS.border}` }}>
                        {data.map((row, i) => {
                            const isLast = i === data.length - 1
                            const heightPct = Math.max(Math.round((row.count / maxCount) * 100), 4)
                            return (
                                <div key={row.week} style={{ flex: 1, background: isLast ? COLORS.accent : COLORS.bgLight, height: `${heightPct}%` }}></div>
                            )
                        })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10.5px", color: COLORS.muted, fontFamily: MONO }}>
                        {data.map(row => <span key={row.week}>{formatWeekLabel(row.week)}</span>)}
                    </div>
                </>
            )}
        </div>
    )
}

export default Weekly
