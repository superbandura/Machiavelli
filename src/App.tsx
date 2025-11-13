import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/components/Login'
import Register from '@/components/Register'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminRoute from '@/components/AdminRoute'
import Lobby from '@/pages/Lobby'
import MapTest from '@/pages/MapTest'
import Game from '@/pages/Game'
import ScenarioEditor from '@/pages/ScenarioEditor'

function App() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map-test"
          element={
            <ProtectedRoute>
              <MapTest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scenario-editor"
          element={
            <AdminRoute>
              <ScenarioEditor />
            </AdminRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
