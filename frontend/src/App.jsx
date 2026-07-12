import { useState, useCallback } from "react"
import Pipeline from "./components/Pipeline"
import Funnel from "./components/Funnel"
import Weekly from "./components/Weekly"
import TimeInStage from "./components/TimeInStage"
import Applications from "./components/Applications"
import Login from "./components/Login"
import Register from "./components/Register"

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("userEmail"))
  const [showRegister, setShowRegister] = useState(false)

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
      <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
        <h1>Job Tracker</h1>
        {showRegister ? (
          <Register onAuthSuccess={handleAuthSuccess} onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <Login onAuthSuccess={handleAuthSuccess} onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Job Tracker Dashboard</h1>
        <div>
          <span style={{ marginRight: "1rem" }}>{userEmail}</span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </div>
      <h2>Applications</h2>
      <Applications onDataChange={handleDataChange} />
      <h2>Pipeline</h2>
      <Pipeline refreshKey={refreshKey} />
      <h2>Funnel</h2>
      <Funnel refreshKey={refreshKey} />
      <h2>Weekly</h2>
      <Weekly refreshKey={refreshKey} />
      <h2>Time in Stage</h2>
      <TimeInStage refreshKey={refreshKey} />
    </div>
  )
}

export default App
