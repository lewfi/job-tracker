import { useState, useEffect } from "react"
import { COLORS, MONO, STATUSES, SOURCES, STATUS_LABELS, SOURCE_LABELS } from "../theme"

const inputStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "12px",
    fontSize: "13.5px",
    width: "100%",
}

const selectStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "12px",
    fontSize: "13px",
    width: "100%",
    background: "#fff",
}

// Mounted only while open (and remounted via a `key` tied to the record being
// edited), so this initial state naturally resets each time it opens — no
// effect-based resync needed, which would otherwise clobber in-progress edits
// on unrelated parent re-renders.
// SLOW_REQUEST_MS: after this long in flight, say the server may be cold-starting.
const SLOW_REQUEST_MS = 4000

function ApplicationDrawer({ title, submitLabel, pendingLabel, initialForm, onClose, onSubmit }) {
    const [form, setForm] = useState(initialForm)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [slow, setSlow] = useState(false)

    useEffect(() => {
        if (!submitting) return
        const timer = setTimeout(() => setSlow(true), SLOW_REQUEST_MS)
        return () => {
            clearTimeout(timer)
            setSlow(false)
        }
    }, [submitting])

    const handleSubmit = (e) => {
        e.preventDefault()
        // The button is disabled while in flight; this also blocks Enter-key resubmits
        if (submitting) return
        setSubmitting(true)
        setError("")
        onSubmit(form)
            .catch((message) => setError(typeof message === "string" && message ? message : "Something went wrong. Try again."))
            .finally(() => setSubmitting(false))
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
                display: "flex", justifyContent: "flex-end", zIndex: 20,
            }}
        >
            <form
                onClick={e => e.stopPropagation()}
                onSubmit={handleSubmit}
                style={{
                    width: "400px", maxWidth: "90vw", height: "100%", background: "#fff",
                    padding: "28px", overflow: "auto", borderLeft: `1px solid ${COLORS.border}`,
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em" }}>{title}</span>
                    <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", color: COLORS.dark, cursor: "pointer" }}>✕</button>
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
                    {slow && <div style={{ fontSize: "12px", color: COLORS.muted, fontFamily: MONO }}>Still working — the server may be waking up, which can take up to a minute.</div>}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
                    <button type="button" onClick={onClose} style={{
                        flex: 1, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: "2px",
                        padding: "12px", fontSize: "13px", fontWeight: 600, fontFamily: MONO,
                    }}>CANCEL</button>
                    <button type="submit" disabled={submitting} style={{
                        flex: 1, background: COLORS.accent, border: "none", borderRadius: "2px",
                        padding: "12px", fontSize: "13px", fontWeight: 600, color: "#fff", fontFamily: MONO,
                        opacity: submitting ? 0.6 : 1, cursor: submitting ? "wait" : "pointer",
                    }}>{submitting ? pendingLabel : submitLabel}</button>
                </div>
            </form>
        </div>
    )
}

export default ApplicationDrawer
