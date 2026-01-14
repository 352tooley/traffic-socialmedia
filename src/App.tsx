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
  Roster,
  Passwords,
  ModifyDistrict,
} from './pages';
import { Approvals } from './pages/Approvals';
import './App.css';

function AppRoutes() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
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
        path="/roster"
        element={
          <ProtectedRoute>
            <Roster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/district"
        element={
          <ProtectedRoute>
            <DistrictOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/store/:storeName"
        element={
          <ProtectedRoute>
            <StoreDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/passwords"
        element={
          <ProtectedRoute>
            <Passwords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <Approvals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/district-modify"
        element={
          <ProtectedRoute>
            <ModifyDistrict />
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
