import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  showBack?: boolean;
}

export function Layout({ children, title, showBack = false }: LayoutProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__header-left">
          {showBack && (
            <button className="layout__back-btn" onClick={handleBack}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="layout__title">{title}</h1>
        </div>
        <div className="layout__header-right">
          {profile && (
            <>
              <span className="layout__user-info">
                {profile.role === 'dm' ? 'DM' : profile.storeName}
              </span>
              <button className="layout__logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>
      <main className="layout__main">{children}</main>
    </div>
  );
}
