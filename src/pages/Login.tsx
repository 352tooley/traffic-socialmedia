import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreList, getStoreRoster } from '../services/sheetsService';
import { Button } from '../components';
import './Login.css';

type LoginMode = 'select' | 'mobile_expert' | 'store' | 'dm';

export function Login() {
  const [mode, setMode] = useState<LoginMode>('select');
  const [selectedStore, setSelectedStore] = useState('');
  const [mobileExpertName, setMobileExpertName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [roster, setRoster] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { loginAsMobileExpert, loginAsStore, loginAsDM, session } = useAuth();

  const stores = getStoreList();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  // Load roster when store changes
  useEffect(() => {
    if (selectedStore && mode === 'mobile_expert') {
      loadRoster(selectedStore);
    }
  }, [selectedStore, mode]);

  const loadRoster = async (storeName: string) => {
    setLoading(true);
    try {
      const storeRoster = await getStoreRoster(storeName);
      setRoster(storeRoster);
    } catch (err) {
      console.error('Error loading roster:', err);
      setRoster([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileExpertLogin = () => {
    if (!selectedStore) {
      setError('Please select a store');
      return;
    }
    if (!mobileExpertName) {
      setError('Please select your name from the roster');
      return;
    }

    loginAsMobileExpert(selectedStore, mobileExpertName);
    navigate('/upload');
  };

  const handleStoreLogin = async () => {
    if (!selectedStore) {
      setError('Please select a store');
      return;
    }
    if (!password) {
      setError('Please enter password');
      return;
    }

    setLoading(true);
    try {
      const success = await loginAsStore(selectedStore, password);
      if (success) {
        navigate('/');
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDMLogin = () => {
    if (!password) {
      setError('Please enter password');
      return;
    }

    if (loginAsDM(password)) {
      navigate('/');
    } else {
      setError('Incorrect password');
    }
  };

  const renderModeSelection = () => (
    <div className="login-modes">
      <h2>Welcome</h2>
      <p>Select how you want to sign in:</p>

      <div className="login-modes__buttons">
        <Button variant="large" fullWidth onClick={() => setMode('mobile_expert')}>
          Mobile Expert - Upload Photos
        </Button>
        <Button variant="large" fullWidth onClick={() => setMode('store')}>
          Store Manager (RSM)
        </Button>
        <Button variant="large" fullWidth onClick={() => setMode('dm')}>
          District Manager
        </Button>
      </div>
    </div>
  );

  const renderMobileExpertLogin = () => (
    <div className="login-form-container">
      <button className="login-back" onClick={() => setMode('select')}>
        &larr; Back
      </button>
      <h2>Mobile Expert Sign In</h2>

      {error && <div className="login-error">{error}</div>}

      <div className="login-field">
        <label>Store</label>
        <select
          value={selectedStore}
          onChange={(e) => {
            setSelectedStore(e.target.value);
            setMobileExpertName('');
            setError('');
          }}
        >
          <option value="">Select your store...</option>
          {stores.map((store) => (
            <option key={store} value={store}>
              {store}
            </option>
          ))}
        </select>
      </div>

      <div className="login-field">
        <label>Your Name</label>
        {loading ? (
          <p className="login-loading">Loading roster...</p>
        ) : roster.length > 0 ? (
          <select
            value={mobileExpertName}
            onChange={(e) => {
              setMobileExpertName(e.target.value);
              setError('');
            }}
          >
            <option value="">Select your name...</option>
            {roster.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : selectedStore ? (
          <p className="login-empty-roster">
            No mobile experts on roster. Contact your RSM to add you.
          </p>
        ) : (
          <p className="login-hint">Select a store first</p>
        )}
      </div>

      <Button
        variant="large"
        fullWidth
        onClick={handleMobileExpertLogin}
        disabled={loading || !mobileExpertName}
      >
        Continue to Upload
      </Button>
    </div>
  );

  const renderStoreLogin = () => (
    <div className="login-form-container">
      <button className="login-back" onClick={() => setMode('select')}>
        &larr; Back
      </button>
      <h2>Store Manager Login</h2>

      {error && <div className="login-error">{error}</div>}

      <div className="login-field">
        <label>Store</label>
        <select
          value={selectedStore}
          onChange={(e) => {
            setSelectedStore(e.target.value);
            setError('');
          }}
        >
          <option value="">Select your store...</option>
          {stores.map((store) => (
            <option key={store} value={store}>
              {store}
            </option>
          ))}
        </select>
      </div>

      <div className="login-field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Enter store password"
        />
      </div>

      <Button variant="large" fullWidth onClick={handleStoreLogin} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <p className="login-hint">
        Default password is "password". Contact DM to reset.
      </p>
    </div>
  );

  const renderDMLogin = () => (
    <div className="login-form-container">
      <button className="login-back" onClick={() => setMode('select')}>
        &larr; Back
      </button>
      <h2>District Manager Login</h2>

      {error && <div className="login-error">{error}</div>}

      <div className="login-field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Enter DM password"
        />
      </div>

      <Button variant="large" fullWidth onClick={handleDMLogin}>
        Sign In
      </Button>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <h1>Traffic Social Media</h1>
        </div>

        {mode === 'select' && renderModeSelection()}
        {mode === 'mobile_expert' && renderMobileExpertLogin()}
        {mode === 'store' && renderStoreLogin()}
        {mode === 'dm' && renderDMLogin()}
      </div>
    </div>
  );
}
