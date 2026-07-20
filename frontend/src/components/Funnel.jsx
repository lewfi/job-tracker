import { useState, useEffect } from "react"
import api from "../api"
import { COLORS, MONO, STATUS_META } from "../theme"

const FUNNEL_STAGES = ["applied", "oa", "screen", "onsite", "offer"]

function Funnel({ refreshKey }) {
    const [data, setData] = useState(null)

    useEffect(() => {
        api.get("/analytics/funnel")
            .then(res => setData(res.data))
    }, [refreshKey])

    if (!data) {
        return <div style={{ padding: "24px", fontFamily: MONO, fontSize: "12px", color: COLORS.muted }}>Loading…</div>
    }

    const byStage = Object.fromEntries(data.map(row => [row.stage, row]))
    const bars = FUNNEL_STAGES.map(stage => byStage[stage] ?? { stage, count: 0, conversion_rate: 0 })

    return (
        <div style={{ padding: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em", marginBottom: "2px" }}>FUNNEL CONVERSION</div>
            <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "18px" }}>Share of applications reaching each stage</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                {bars.map((row) => {
                    const pct = Math.round(row.conversion_rate * 100)
                    return (
                        <div key={row.stage} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                                width: "180px", height: "28px",
                                border: `1px solid ${COLORS.border}`,
                            }}>
                                <div style={{
                                    width: `${Math.max(pct, 4)}%`, height: "100%",
                                    background: STATUS_META[row.stage].swatch,
                                }}></div>
                            </div>
                            <span style={{ fontSize: "12px", fontFamily: MONO, whiteSpace: "nowrap", color: COLORS.dark }}>
                                {row.stage.toUpperCase()} · {pct}%
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Funnel
