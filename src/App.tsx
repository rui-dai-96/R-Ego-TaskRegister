import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import LoginPage from './features/auth/LoginPage'
import PasswordChangePage from './features/auth/PasswordChangePage'

const Dashboard = lazy(() => import('./features/dashboard/Dashboard'))
const ProductionWorkspace = lazy(() => import('./features/dashboard/ProductionWorkspace'))

function ProtectedLayout() {
  const { profile, loading, demoMode } = useAuth()
  if (loading) return <div className="panel empty-state">正在恢复安全会话…</div>
  if (!profile) return <Navigate to="/login" replace />
  if (profile.must_change_password) return <Navigate to="/change-password" replace />
  if (demoMode) return <Dashboard initialRole="admin" allowRoleSwitch />
  return <Outlet />
}

export default function App() {
  return <Suspense fallback={<div className="panel empty-state">正在加载工作台…</div>}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/change-password" element={<PasswordChangePage />} />
    <Route element={<ProtectedLayout />}>
      <Route index element={<ProductionWorkspace />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}
