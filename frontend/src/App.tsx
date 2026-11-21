import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './layouts/AppLayout.tsx'
import FeedPage from './pages/FeedPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'
import GuestRoute from './routes/GuestRoute.tsx'
import ProtectedRoute from './routes/ProtectedRoute.tsx'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<FeedPage />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
