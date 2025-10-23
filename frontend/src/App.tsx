import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PaymentPage from './pages/PaymentPage';
import Dashboard from './pages/Dashboard.tsx';
import ProtectedRoute from './components/ProtectedRoute';
import CoverPage from './pages/CoverPage';
import AdminDashboard from './pages/AdminDashboard';
import Header from './components/Header';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<CoverPage />} />
          <Route path="/cover" element={<CoverPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
