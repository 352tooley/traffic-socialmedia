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
  const { session, logout } = useAuth();

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleHome = () => {
    navigate('/');
  };

  const getUserLabel = () => {
    if (!session) return '';
    if (session.role === 'dm') return 'DM';
    if (session.role === 'store') return session.storeName;
    return `${session.storeName}`;
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
          <h1 className="layout__title" onClick={handleHome} style={{ cursor: 'pointer' }}>
            {title}
          </h1>
        </div>
        <div className="layout__header-right">
          {session && (
            <>
              <span className="layout__user-info">{getUserLabel()}</span>
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
