import { useState } from "react"
import { COLORS, MONO, STATUSES, SOURCES, STATUS_LABELS, SOURCE_LABELS } from "../theme"

const inputStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "10px 12px",
    fontSize: "13.5px",
    width: "100%",
}

const selectStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "10px 12px",
    fontSize: "13px",
    width: "100%",
    background: "#fff",
}

// Mounted only while open (and remounted via a `key` tied to the record being
// edited), so this initial state naturally resets each time it opens — no
// effect-based resync needed, which would otherwise clobber in-progress edits
// on unrelated parent re-renders.
function ApplicationDrawer({ title, submitLabel, initialForm, onClose, onSubmit }) {
    const [form, setForm] = useState(initialForm)
    const [error, setError] = useState("")

    const handleSubmit = () => {
        onSubmit(form)
            .then(() => setError(""))
            .catch((message) => setError(typeof message === "string" && message ? message : "Something went wrong. Check your inputs."))
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
                display: "flex", justifyContent: "flex-end", zIndex: 20,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: "400px", maxWidth: "90vw", height: "100%", background: "#fff",
                    padding: "28px", overflow: "auto", borderLeft: `1px solid ${COLORS.border}`,
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em" }}>{title}</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", color: COLORS.dark, cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
                    <input placeholder="Company *" value={form.company} style={inputStyle}
                        onChange={e => setForm({ ...form, company: e.target.value })} />
                    <input placeholder="Role *" value={form.role} style={inputStyle}
                        onChange={e => setForm({ ...form, role: e.target.value })} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <input type="date" value={form.date_applied} style={inputStyle}
                            onChange={e => setForm({ ...form, date_applied: e.target.value })} />
                        <select value={form.source} style={selectStyle}
                            onChange={e => setForm({ ...form, source: e.target.value })}>
                            {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                        </select>
                    </div>
                    <select value={form.status} style={selectStyle}
                        onChange={e => setForm({ ...form, status: e.target.value })}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                    <input placeholder="Location" value={form.location} style={inputStyle}
                        onChange={e => setForm({ ...form, location: e.target.value })} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <input placeholder="Salary min" type="number" value={form.salary_min} style={inputStyle}
                            onChange={e => setForm({ ...form, salary_min: e.target.value })} />
                        <input placeholder="Salary max" type="number" value={form.salary_max} style={inputStyle}
                            onChange={e => setForm({ ...form, salary_max: e.target.value })} />
                    </div>
                    <textarea placeholder="Notes" rows={3} value={form.notes}
                        style={{ ...inputStyle, resize: "none" }}
                        onChange={e => setForm({ ...form, notes: e.target.value })} />
                    {error && <div style={{ fontSize: "12px", color: COLORS.error, fontFamily: MONO }}>{error}</div>}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
                    <button onClick={onClose} style={{
                        flex: 1, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: "2px",
                        padding: "12px", fontSize: "13px", fontWeight: 600, fontFamily: MONO,
                    }}>CANCEL</button>
                    <button onClick={handleSubmit} style={{
                        flex: 1, background: COLORS.accent, border: "none", borderRadius: "2px",
                        padding: "12px", fontSize: "13px", fontWeight: 600, color: "#fff", fontFamily: MONO,
                    }}>{submitLabel}</button>
                </div>
            </div>
        </div>
    )
}

export default ApplicationDrawer
