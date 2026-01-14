import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchStoreList, getStoreRoster } from '../services/sheetsService';
import { DISTRICTS, type District } from '../config';
import { Button } from '../components';
import { PhotoHero } from '../components/PhotoHero';
import './Login.css';

type LoginMode = 'select' | 'mobile_expert' | 'store' | 'dm';

export function Login() {
  const [mode, setMode] = useState<LoginMode>('select');
  const [selectedDistrict, setSelectedDistrict] = useState<District>('West');
  const [selectedStore, setSelectedStore] = useState('');
  const [mobileExpertName, setMobileExpertName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [roster, setRoster] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<string[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedDMDistrict, setSelectedDMDistrict] = useState<District>('West');

  const navigate = useNavigate();
  const { loginAsMobileExpert, loginAsStore, loginAsDM, session } = useAuth();

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

  useEffect(() => {
    if (mode === 'mobile_expert' || mode === 'store') {
      loadStores(selectedDistrict);
    }
  }, [mode, selectedDistrict]);

  const loadStores = async (district: District) => {
    setStoresLoading(true);
    try {
      const storeList = await fetchStoreList(district);
      setStores(storeList);
    } catch (err) {
      console.error('Error loading stores:', err);
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  };

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
    if (!selectedDistrict) {
      setError('Please select a district');
      return;
    }
    if (!selectedStore) {
      setError('Please select a store');
      return;
    }
    if (!mobileExpertName) {
      setError('Please select your name from the roster');
      return;
    }

    loginAsMobileExpert(selectedDistrict, selectedStore, mobileExpertName);
    navigate('/upload');
  };

  const handleStoreLogin = async () => {
    if (!selectedDistrict) {
      setError('Please select a district');
      return;
    }
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
      const success = await loginAsStore(selectedDistrict, selectedStore, password);
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

    if (loginAsDM(password, selectedDMDistrict)) {
      navigate('/');
    } else {
      setError('Incorrect password');
    }
  };

  const renderModeSelection = () => (
    <div className="login-modes">
      <h2>Welcome Back!</h2>
      <p>Choose your role to get started</p>

      <div className="login-modes__cards">
        <div className="login-mode-card" onClick={() => setMode('mobile_expert')}>
          <span className="login-mode-card__icon">📸</span>
          <h3 className="login-mode-card__title">Mobile Expert</h3>
          <p className="login-mode-card__description">Upload and share your store photos</p>
        </div>
        
        <div className="login-mode-card" onClick={() => setMode('store')}>
          <span className="login-mode-card__icon">🏪</span>
          <h3 className="login-mode-card__title">Store Manager</h3>
          <p className="login-mode-card__description">Manage your team and view reports</p>
        </div>
        
        <div className="login-mode-card" onClick={() => setMode('dm')}>
          <span className="login-mode-card__icon">📊</span>
          <h3 className="login-mode-card__title">District Manager</h3>
          <p className="login-mode-card__description">District-wide insights and analytics</p>
        </div>
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
        <label>District</label>
        <select
          value={selectedDistrict}
          onChange={(e) => {
            setSelectedDistrict(e.target.value as District);
            setSelectedStore('');
            setMobileExpertName('');
            setError('');
          }}
        >
          {DISTRICTS.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <div className="login-field">
        <label>Store</label>
        <select
          value={selectedStore}
          onChange={(e) => {
            setSelectedStore(e.target.value);
            setMobileExpertName('');
            setError('');
          }}
          disabled={storesLoading}
        >
          <option value="">
            {storesLoading ? 'Loading stores...' : 'Select your store...'}
          </option>
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
        <label>District</label>
        <select
          value={selectedDistrict}
          onChange={(e) => {
            setSelectedDistrict(e.target.value as District);
            setSelectedStore('');
            setError('');
          }}
        >
          {DISTRICTS.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <div className="login-field">
        <label>Store</label>
        <select
          value={selectedStore}
          onChange={(e) => {
            setSelectedStore(e.target.value);
            setError('');
          }}
          disabled={storesLoading}
        >
          <option value="">
            {storesLoading ? 'Loading stores...' : 'Select your store...'}
          </option>
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
        <label>District</label>
        <select
          value={selectedDMDistrict}
          onChange={(e) => {
            setSelectedDMDistrict(e.target.value as District);
            setError('');
          }}
        >
          {DISTRICTS.map((district) => (
            <option key={district} value={district}>
              {district}
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
      {mode === 'select' && <PhotoHero />}
      
      <div className="login-container">
        {mode === 'select' && renderModeSelection()}
        {mode === 'mobile_expert' && renderMobileExpertLogin()}
        {mode === 'store' && renderStoreLogin()}
        {mode === 'dm' && renderDMLogin()}
      </div>
    </div>
  );
}
