import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireDM?: boolean;
}

export function ProtectedRoute({ children, requireDM = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="protected-route-loading">
        <Loading message="Loading..." />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (requireDM && profile.role !== 'dm') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
