import { useState, useEffect } from "react"
import api from "../api"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function Funnel() {
    const [data, setData] = useState(null)

    useEffect(() => {
        api.get("/analytics/funnel")
            .then(res => setData(res.data))
    }, [])
    
    // render chart using data
    if (!data) {
        return <div>Loading...</div>
    }

    const chartData = {
        labels: data.map(item => item.stage),
        datasets: [
            {
                label: "Number of Applications",
                data: data.map(item => item.count),
                backgroundColor: "rgba(153, 102, 255, 0.6)",
            },
        ],
    }

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: "top",
            },
            title: {
                display: true,
                text: "Funnel Chart",
            },
        },
    }

    return <Bar data={chartData} options={options} />
}

export default Funnel