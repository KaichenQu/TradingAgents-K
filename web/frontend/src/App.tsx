import { Routes, Route, Navigate } from 'react-router-dom'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'
import BatchPage from './pages/BatchPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/setup" replace />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/job/:jobId" element={<DashboardPage />} />
      <Route path="/batch" element={<BatchPage />} />
    </Routes>
  )
}
