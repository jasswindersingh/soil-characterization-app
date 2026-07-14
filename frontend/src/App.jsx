import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Auth } from './Auth';
import { InteractiveButton } from './InteractiveButton';
import { useTranslation } from './LanguageContext';
import './App.css';

gsap.registerPlugin(useGSAP);

function App() {
  const { t, locale, changeLanguage } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken'));
  const [userProfile, setUserProfile] = useState(localStorage.getItem('authToken') ? 'Jassis' : '');
  const [activeMode, setActiveMode] = useState('tabular');
  
  // Application Data Workspace States
  const [formData, setFormData] = useState({ N: '', P: '', K: '', temperature: '', humidity: '', ph: '', rainfall: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [historyLog, setHistoryLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const resultRef = useRef(null);
  const dynamicFormRef = useRef(null);

  const fetchUserHistoryLog = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHistoryLog(data.history.reverse());
      }
    } catch (err) {
      console.error("Failed to query records channel logs.", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserHistoryLog();
    }
  }, [isAuthenticated]);

  const playSuccessChime = () => {
    const audio = new Audio('/mixkit-unlock-game-notification-253.wav');
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  // Crisp mechanical removal/trash click audio trigger
  const playDeleteSound = () => {
    const audio = new Audio('/mixkit-remove-item-from-basket-2440.wav');
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  useGSAP(() => {
    if (isAuthenticated) {
      const tl = gsap.timeline();
      tl.fromTo('.card-main', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 });
      tl.fromTo('.history-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4");
    }
  }, [isAuthenticated]);

  useGSAP(() => {
    if (isAuthenticated) {
      gsap.fromTo(dynamicFormRef.current,
        { opacity: 0, x: activeMode === 'tabular' ? -15 : 15 },
        { opacity: 1, x: 0, duration: 0.3 }
      );
      setPrediction(null);
      setError(null);
    }
  }, [activeMode]);

  const handleAuthSuccess = (username) => {
    setUserProfile(username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setPrediction(null);
    setHistoryLog([]);
  };

  const handleTextChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);
    const token = localStorage.getItem('authToken');

    try {
      let response;
      if (activeMode === 'tabular') {
        const payload = {
          N: parseFloat(formData.N), P: parseFloat(formData.P), K: parseFloat(formData.K),
          temperature: parseFloat(formData.temperature), humidity: parseFloat(formData.humidity),
          ph: parseFloat(formData.ph), rainfall: parseFloat(formData.rainfall)
        };
        response = await fetch('http://localhost:8000/predict', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
      } else {
        if (!selectedFile) throw new Error("Please pick a soil sample image asset first.");
        const filePayload = new FormData();
        filePayload.append('file', selectedFile);
        response = await fetch('http://localhost:8000/predict-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: filePayload,
        });
      }

      const data = await response.json();
      if (response.ok && data.success) {
        playSuccessChime();
        // FIXED: Preserving characteristics inside state explicitly
        setPrediction(
          activeMode === 'tabular' 
            ? { type: 'crop', value: data.prediction } 
            : { 
                type: 'soil', 
                value: data.soil_type, 
                confidence: data.confidence, 
                secondary_match: data.secondary_match,
                characteristics: data.characteristics 
              }
        );
        fetchUserHistoryLog(); 
      } else {
        setError(data.detail || 'Processing error on classification execution.');
      }
    } catch (err) {
      setError(t.NET_ERROR || 'Gateway communication threshold failure.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (timestamp) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:8000/history?timestamp=${encodeURIComponent(timestamp)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        playDeleteSound();
        setHistoryLog(data.history.reverse());
      }
    } catch (err) {
      console.error("Failed to delete record log entry.", err);
    }
  };

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  const pg = t.placeholderGeneric;

  // Hybrid Verification Engine: Checks translations.js with backend direct objects as a fallback
  const getSoilTranslation = (soilValue) => {
    if (!soilValue) return null;
    const cleanedValue = soilValue.toLowerCase().replace(' ', '_');
    const targetKey = Object.keys(t).find(
      (key) => key.toLowerCase() === cleanedValue || key.toLowerCase() === soilValue.toLowerCase()
    );
    return targetKey ? t[targetKey] : null;
  };

  const translatedSoilProfile = prediction && prediction.type === 'soil' ? getSoilTranslation(prediction.value) : null;
  
  // Merge dictionaries dynamically to guarantee presentation blocks never remain blank
  const localSoilData = prediction && prediction.type === 'soil' ? {
    description: translatedSoilProfile?.description || prediction.characteristics?.description,
    color: translatedSoilProfile?.color || prediction.characteristics?.color,
    texture: translatedSoilProfile?.texture || prediction.characteristics?.texture,
    best_crops: translatedSoilProfile?.best_crops || prediction.characteristics?.best_crops,
  } : null;

  return (
    <div className="container" ref={containerRef}>
      <div className="logout-bar">
        <span>{t.loggedInAs} <strong>{userProfile}</strong></span>
        <div className="logout-actions">
          <div className="language-switcher">
            <InteractiveButton className={`lang-btn ${locale === 'en' ? 'active' : ''}`} onClick={() => changeLanguage('en')}>EN</InteractiveButton>
            <InteractiveButton className={`lang-btn ${locale === 'hi' ? 'active' : ''}`} onClick={() => changeLanguage('hi')}>हिं</InteractiveButton>
          </div>
          <InteractiveButton onClick={handleLogout} className="logout-btn">{t.btnLogout}</InteractiveButton>
        </div>
      </div>

      <header className="animate-header">
        <h1>{t.headerTitle}</h1>
        <p>{t.headerSub}</p>
      </header>

      <div className="toggle-container">
        <InteractiveButton className={`toggle-btn ${activeMode === 'tabular' ? 'active' : ''}`} onClick={() => setActiveMode('tabular')}>{t.tabTabular}</InteractiveButton>
        <InteractiveButton className={`toggle-btn ${activeMode === 'image' ? 'active' : ''}`} onClick={() => setActiveMode('image')}>{t.tabImage}</InteractiveButton>
      </div>

      <main className="card card-main">
        <form onSubmit={handleSubmit}>
          <div ref={dynamicFormRef}>
            {activeMode === 'tabular' ? (
              <div className="form-grid">
                <div className="form-group"><label>{t.inputN}</label><input type="number" step="any" name="N" value={formData.N} onChange={handleTextChange} required placeholder={`${pg} 90`} /></div>
                <div className="form-group"><label>{t.inputP}</label><input type="number" step="any" name="P" value={formData.P} onChange={handleTextChange} required placeholder={`${pg} 42`} /></div>
                <div className="form-group"><label>{t.inputK}</label><input type="number" step="any" name="K" value={formData.K} onChange={handleTextChange} required placeholder={`${pg} 43`} /></div>
                <div className="form-group"><label>{t.inputTemp}</label><input type="number" step="any" name="temperature" value={formData.temperature} onChange={handleTextChange} required placeholder={`${pg} 21.5`} /></div>
                <div className="form-group"><label>{t.inputHumid}</label><input type="number" step="any" name="humidity" value={formData.humidity} onChange={handleTextChange} required placeholder={`${pg} 82.0`} /></div>
                <div className="form-group"><label>{t.inputPh}</label><input type="number" step="any" name="ph" value={formData.ph} onChange={handleTextChange} required placeholder={`${pg} 6.5`} /></div>
                <div className="form-group full-width"><label>{t.inputRain}</label><input type="number" step="any" name="rainfall" value={formData.rainfall} onChange={handleTextChange} required placeholder={`${pg} 202.9`} /></div>
              </div>
            ) : (
              <div className="upload-container">
                <div className="upload-box">
                  <input type="file" accept="image/*" id="soil-file" onChange={handleFileChange} style={{ display: 'none' }} />
                  <label htmlFor="soil-file" className="upload-label">{previewUrl ? 'Change Selected Matrix' : 'Select Ground Profile Photo'}</label>
                  {previewUrl && <div className="preview-frame"><img src={previewUrl} alt="Soil map view" /></div>}
                </div>
              </div>
            )}
          </div>

          <InteractiveButton type="submit" className="submit-btn" disabled={loading}>
            {loading ? t.loadingML : t.btnSubmit}
          </InteractiveButton>
        </form>

        {error && <div className="alert error">{error}</div>}

        {prediction && (
          <div className="alert success" ref={resultRef}>
            {prediction.type === 'crop' ? (
              <>
                <h3>{t.resultOptimal}</h3>
                <div className="result-badge crop-badge">{prediction.value.toUpperCase()}</div>
              </>
            ) : (
              <>
                <h3>{t.resultSoil}</h3>
                <div className="result-badge soil-badge">{prediction.value.toUpperCase().replace('_', ' ')}</div>
                <p className="confidence-text">{t.resultConf}: {(prediction.confidence * 100).toFixed(1)}%</p>
                
                {prediction.secondary_match && (
                  <div style={{ margin: '14px 0 6px 0', padding: '6px 14px', background: '#f1f2f6', border: '1px solid #dcdde1', borderRadius: '30px', display: 'inline-block', fontSize: '13px' }}>
                    Alternative Landscape Match: <strong>{prediction.secondary_match.soil_type.replace('_', ' ').toUpperCase()}</strong> ({(prediction.secondary_match.confidence * 100).toFixed(1)}%)
                  </div>
                )}
                
                {/* SAFE RUNTIME RENDERING FRAMEWORK */}
                {localSoilData && localSoilData.description && (
                  <div className="characteristics-box" style={{ marginTop: '20px', padding: '15px', borderTop: '1px solid #e2e8f0', textAlign: 'left', fontSize: '14px', lineHeight: '1.6' }}>
                    <p style={{ margin: '6px 0' }}><strong>{t.lblDesc}:</strong> {localSoilData.description}</p>
                    <p style={{ margin: '6px 0' }}><strong>{t.lblColor}:</strong> {localSoilData.color}</p>
                    <p style={{ margin: '6px 0' }}><strong>{t.lblTexture}:</strong> {localSoilData.texture}</p>
                    <p style={{ margin: '6px 0', color: '#1b4d3e' }}><strong>{t.lblCrops}:</strong> {localSoilData.best_crops}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <section className="card history-card" style={{ marginTop: '30px', padding: '30px' }}>
        <h2 style={{ color: '#1b4d3e', fontSize: '1.5rem', marginTop: 0, marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          {t.historyTitle}
        </h2>
        {historyLog.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>{t.historyEmpty}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '12px 8px' }}>{t.colTimestamp}</th>
                  <th style={{ padding: '12px 8px' }}>{t.colType}</th>
                  <th style={{ padding: '12px 8px' }}>{t.colPrediction}</th>
                  <th style={{ padding: '12px 8px' }}>{t.colMetrics}</th>
                  <th style={{ padding: '12px 8px', textAlignment: 'center' }}>{t.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {historyLog.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', color: '#2c3e50' }}>
                    <td style={{ padding: '12px 8px', whiteSpace: 'nowrap', color: '#7f8c8d' }}>{item.timestamp}</td>
                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', background: item.type === 'tabular' ? '#e3f2fd' : '#efebe9', color: item.type === 'tabular' ? '#0d47a1' : '#4e342e' }}>
                        {item.type === 'tabular' ? t.typeTabular : t.typeImage}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: '700', color: '#1b4d3e' }}>{item.output}</td>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#57606f' }}>{item.metric}</td>
                    <td style={{ padding: '12px 8px', textAlignment: 'center' }}>
                      <InteractiveButton 
                        onClick={() => handleDeleteRecord(item.timestamp)}
                        style={{ padding: '4px 10px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}
                      >
                        {t.btnDelete}
                      </InteractiveButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;