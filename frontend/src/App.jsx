import Pipeline from "./components/Pipeline"
import Funnel from "./components/Funnel"
import Weekly from "./components/Weekly"
import TimeInStage from "./components/TimeInStage"
import Applications from "./components/Applications"

function App() {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Job Tracker Dashboard</h1>
      <h2>Applications</h2>
      <Applications />
      <h2>Pipeline</h2>
      <Pipeline />
      <h2>Funnel</h2>
      <Funnel />
      <h2>Weekly</h2>
      <Weekly />
      <h2>Time in Stage</h2>
      <TimeInStage />
    </div>
  )
}

export default App