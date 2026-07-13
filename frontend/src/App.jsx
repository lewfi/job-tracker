import { useState, useCallback, useRef } from "react"
import Applications from "./components/Applications"
import Analytics from "./components/Analytics"
import Login from "./components/Login"
import Register from "./components/Register"
import Logo from "./components/Logo"
import { COLORS, MONO } from "./theme"

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("userEmail"))
  const [showRegister, setShowRegister] = useState(false)
  const [tab, setTab] = useState("apps")
  const applicationsRef = useRef(null)

  const handleDataChange = useCallback(() => {
    setRefreshKey(key => key + 1)
  }, [])

  const handleAuthSuccess = useCallback((email, newToken) => {
    localStorage.setItem("token", newToken)
    localStorage.setItem("userEmail", email)
    setToken(newToken)
    setUserEmail(email)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")
    setToken(null)
    setUserEmail(null)
    setShowRegister(false)
  }, [])

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "28px", background: "#fff" }}>
        <Logo />
        <div style={{ width: "360px", maxWidth: "90vw" }}>
          {showRegister ? (
            <Register onAuthSuccess={handleAuthSuccess} onSwitchToLogin={() => setShowRegister(false)} />
          ) : (
            <Login onAuthSuccess={handleAuthSuccess} onSwitchToRegister={() => setShowRegister(true)} />
          )}
        </div>
      </div>
    )
  }

  const tabStyle = (active) => ({
    background: "none", border: "none", padding: "0 0 12px", fontSize: "13.5px", fontWeight: 600,
    fontFamily: MONO, letterSpacing: ".03em", color: active ? COLORS.dark : COLORS.mutedLight,
    borderBottom: `2px solid ${active ? COLORS.accent : "transparent"}`, cursor: "pointer",
  })

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: COLORS.dark }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <Logo />
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <span style={{ fontSize: "13px", color: COLORS.muted, fontFamily: MONO }}>{userEmail}</span>
              <button onClick={() => applicationsRef.current?.openAddDrawer()} style={{
                background: COLORS.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: "2px",
                fontSize: "13px", fontWeight: 600, fontFamily: MONO, letterSpacing: ".02em",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{ fontSize: "15px", lineHeight: 1 }}>+</span> ADD APPLICATION
              </button>
              <button onClick={handleLogout} style={{
                background: "#fff", color: COLORS.dark, border: `1px solid ${COLORS.border}`, padding: "10px 16px",
                borderRadius: "2px", fontSize: "12px", fontFamily: MONO,
              }}>LOG OUT</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "28px" }}>
            <button onClick={() => setTab("apps")} style={tabStyle(tab === "apps")}>APPLICATIONS</button>
            <button onClick={() => setTab("analytics")} style={tabStyle(tab === "analytics")}>ANALYTICS</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 32px 80px" }}>
        <div style={{ display: tab === "apps" ? "block" : "none" }}>
          <Applications ref={applicationsRef} onDataChange={handleDataChange} />
        </div>
        <div style={{ display: tab === "analytics" ? "block" : "none" }}>
          <Analytics refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  )
}

export default App
