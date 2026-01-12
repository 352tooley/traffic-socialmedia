import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components';
import {
  Login,
  Home,
  UploadPhoto,
  DownloadPhotos,
  Reporting,
  DistrictOverview,
  StoreDetail,
} from './pages';
import './App.css';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <UploadPhoto />
          </ProtectedRoute>
        }
      />
      <Route
        path="/photos"
        element={
          <ProtectedRoute>
            <DownloadPhotos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reporting"
        element={
          <ProtectedRoute>
            <Reporting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/district"
        element={
          <ProtectedRoute requireDM>
            <DistrictOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/store/:storeName"
        element={
          <ProtectedRoute requireDM>
            <StoreDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename="/traffic-socialmedia">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
