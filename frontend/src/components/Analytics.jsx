import Pipeline from "./Pipeline"
import Funnel from "./Funnel"
import Weekly from "./Weekly"
import TimeInStage from "./TimeInStage"
import { COLORS } from "../theme"

function Analytics({ refreshKey }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: `1px solid ${COLORS.border}` }}>
            <div style={{ borderRight: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}>
                <Pipeline refreshKey={refreshKey} />
            </div>
            <div style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <Funnel refreshKey={refreshKey} />
            </div>
            <div style={{ borderRight: `1px solid ${COLORS.border}` }}>
                <Weekly refreshKey={refreshKey} />
            </div>
            <div>
                <TimeInStage refreshKey={refreshKey} />
            </div>
        </div>
    )
}

export default Analytics
