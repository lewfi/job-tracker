import { useState, useCallback } from "react"
import Pipeline from "./components/Pipeline"
import Funnel from "./components/Funnel"
import Weekly from "./components/Weekly"
import TimeInStage from "./components/TimeInStage"
import Applications from "./components/Applications"

function App() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDataChange = useCallback(() => {
    setRefreshKey(key => key + 1)
  }, [])

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Job Tracker Dashboard</h1>
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
