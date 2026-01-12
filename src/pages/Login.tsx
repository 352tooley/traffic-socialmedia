import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreList, getStoreRoster } from '../services/sheetsService';
import { Button } from '../components';
import './Login.css';

type LoginMode = 'select' | 'rep' | 'store' | 'dm';

const LAST_STORE_KEY = 'traffic_sm_last_store';
const LAST_REP_KEY = 'traffic_sm_last_rep';

export function Login() {
  const [mode, setMode] = useState<LoginMode>('select');
  const [selectedStore, setSelectedStore] = useState('');
  const [repName, setRepName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [roster, setRoster] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { loginAsRep, loginAsStore, loginAsDM, session } = useAuth();

  const stores = getStoreList();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  // Load last used store and rep name
  useEffect(() => {
    const lastStore = localStorage.getItem(LAST_STORE_KEY);
    const lastRep = localStorage.getItem(LAST_REP_KEY);
    if (lastStore) setSelectedStore(lastStore);
    if (lastRep) setRepName(lastRep);
  }, []);

  // Load roster when store changes
  useEffect(() => {
    if (selectedStore && mode === 'rep') {
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

  const handleRepLogin = () => {
    if (!selectedStore) {
      setError('Please select a store');
      return;
    }
    if (!repName.trim()) {
      setError('Please enter or select your name');
      return;
    }

    // Save preferences
    localStorage.setItem(LAST_STORE_KEY, selectedStore);
    localStorage.setItem(LAST_REP_KEY, repName.trim());

    loginAsRep(selectedStore, repName.trim());
    navigate('/upload');
  };

  const handleStoreLogin = () => {
    if (!selectedStore) {
      setError('Please select a store');
      return;
    }
    if (!password) {
      setError('Please enter password');
      return;
    }

    if (loginAsStore(selectedStore, password)) {
      localStorage.setItem(LAST_STORE_KEY, selectedStore);
      navigate('/');
    } else {
      setError('Incorrect password');
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
        <Button variant="large" fullWidth onClick={() => setMode('rep')}>
          Rep - Upload Photos
        </Button>
        <Button variant="large" fullWidth onClick={() => setMode('store')}>
          Store Manager
        </Button>
        <Button variant="large" fullWidth onClick={() => setMode('dm')}>
          District Manager
        </Button>
      </div>
    </div>
  );

  const renderRepLogin = () => (
    <div className="login-form-container">
      <button className="login-back" onClick={() => setMode('select')}>
        &larr; Back
      </button>
      <h2>Rep Sign In</h2>

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
        <label>Your Name</label>
        {roster.length > 0 ? (
          <select
            value={repName}
            onChange={(e) => {
              setRepName(e.target.value);
              setError('');
            }}
          >
            <option value="">Select your name...</option>
            {roster.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="__other__">Other (type name)</option>
          </select>
        ) : (
          <input
            type="text"
            value={repName}
            onChange={(e) => {
              setRepName(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
          />
        )}
        {repName === '__other__' && (
          <input
            type="text"
            className="login-field__other"
            onChange={(e) => {
              setRepName(e.target.value);
              setError('');
            }}
            placeholder="Type your name"
            autoFocus
          />
        )}
      </div>

      <Button
        variant="large"
        fullWidth
        onClick={handleRepLogin}
        disabled={loading}
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

      <Button variant="large" fullWidth onClick={handleStoreLogin}>
        Sign In
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
        {mode === 'rep' && renderRepLogin()}
        {mode === 'store' && renderStoreLogin()}
        {mode === 'dm' && renderDMLogin()}
      </div>
    </div>
  );
}
