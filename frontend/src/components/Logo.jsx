import { COLORS, MONO } from "../theme"

function Logo() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "26px", height: "26px", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "10px", height: "10px", background: COLORS.accent }}></div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: "16px", fontWeight: 600, letterSpacing: "-0.01em" }}>JOB_TRACKER</span>
        </div>
    )
}

export default Logo
