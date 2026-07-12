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

function formatDays(avgDays) {
    const hours = avgDays * 24
    if (hours < 1) {
        return "< 1 hour"
    }
    if (avgDays < 1) {
        return `${Math.round(hours)} hours`
    }
    return `${avgDays.toFixed(1)} days`
}

function TimeInStage({ refreshKey }) {
    const [data, setData] = useState(null)

    useEffect(() => {
        api.get("/analytics/time-in-stage")
            .then(res => setData(res.data))
    }, [refreshKey])

    // render chart using data
    if (!data) {
        return <div>Loading...</div>
    }

    const chartData = {
        labels: data.map(item => item.stage),
        datasets: [
            {
                label: "Average Time in Stage (days)",
                data: data.map(item => item.avg_days),
                backgroundColor: "rgba(255, 206, 86, 0.6)",
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
                text: "Average Time in Stage Chart",
            },
            tooltip: {
                callbacks: {
                    label: (context) => formatDays(context.parsed.y),
                },
            },
        },
    }

    return (
        <div>
            <Bar data={chartData} options={options} />
            <ul>
                {data.map(item => (
                    <li key={item.stage}>{item.stage}: {formatDays(item.avg_days)}</li>
                ))}
            </ul>
        </div>
    )
}

export default TimeInStage