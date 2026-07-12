import { useState, useEffect } from "react"
import api from "../api"

function Applications() {
    const [applications, setApplications] = useState([])

    useEffect(() => {
        api.get("/applications")
            .then(res => setApplications(res.data))
    }, [])

    if (!applications.length) {
        return <div>Loading...</div>
    }

    return (
        <table>
            <thead>
                <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Date Applied</th>
                    <th>Source</th>
                    <th>Location</th>
                </tr>
            </thead>
            <tbody>
                {applications.map(app => (
                    <tr key={app.id}>
                        <td>{app.company}</td>
                        <td>{app.role}</td>
                        <td>{app.status}</td>
                        <td>{new Date(app.date_applied).toLocaleDateString()}</td>
                        <td>{app.source}</td>
                        <td>{app.location}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default Applications