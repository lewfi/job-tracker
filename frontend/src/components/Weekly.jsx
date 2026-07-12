import { useState, useEffect } from "react"
import axios from "axios"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function Weekly() {
    const [data, setData] = useState(null)

    useEffect(() => {
        axios.get("http://localhost:8000/analytics/weekly")
            .then(res => setData(res.data))
    }, [])
    
    // render chart using data
    if (!data) {
        return <div>Loading...</div>
    }

    const chartData = {
        labels: data.map(item => item.week),
        datasets: [
            {
                label: "Number of Applications",
                data: data.map(item => item.count),
                borderColor: "rgba(255, 99, 132, 1)",
                backgroundColor: "rgba(255, 99, 132, 0.2)",
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
                text: "Weekly Applications Chart",
            },
        },
    }
    
    return <Line data={chartData} options={options} />
}

export default Weekly