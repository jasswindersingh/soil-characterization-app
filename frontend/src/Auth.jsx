import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { InteractiveButton } from './InteractiveButton';
import { useTranslation } from './LanguageContext';

export function Auth({ onAuthSuccess }) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const authCardRef = useRef(null);

  const playSuccessSound = () => {
    const audio = new Audio('/mixkit-unlock-game-notification-253.wav');
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  const toggleAuthMode = () => {
    const currentRotation = isLogin ? 180 : 0;
    
    gsap.to(authCardRef.current, {
      rotationY: currentRotation,
      duration: 0.6,
      ease: 'back.out(1.1)',
      onComplete: () => {
        setIsLogin(!isLogin);
        setError(null);
        setMessage(null);
        setUsername('');
        setPassword('');
      }
    });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    
    try {
      // Updated endpoint URL pointing to live Render backend instance
      const response = await fetch(`https://soil-characterization-app.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        playSuccessSound();
        if (isLogin) {
          localStorage.setItem('authToken', data.token);
          onAuthSuccess(data.username);
        } else {
          setMessage(t.msgSuccessReg);
          setTimeout(toggleAuthMode, 1500);
        }
      } else {
        setError(t[data.detail] || data.detail || 'Authentication execution failure.');
      }
    } catch (err) {
      setError(t.NET_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-perspective">
      <div className="card auth-card" ref={authCardRef}>
        
        <div className={`auth-inner-content ${!isLogin ? 'flipped-layout' : ''}`}>
          <h2>{isLogin ? t.loginTitle : t.registerTitle}</h2>
          <p className="auth-subtitle">{t.subtitle}</p>

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label>{t.labelUsername}</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                placeholder="e.g. administrator" 
                disabled={loading} 
              />
            </div>
            <div className="form-group">
              <label>{t.labelPassword}</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                disabled={loading} 
              />
            </div>

            <InteractiveButton type="submit" className="submit-btn" disabled={loading}>
              {loading ? t.validating : isLogin ? t.btnAuth : t.btnProvision}
            </InteractiveButton>
          </form>

          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success-message">{message}</div>}

          <p className="auth-toggle-prompt">
            {isLogin ? t.promptNew : t.promptRegistered}
            <span onClick={!loading ? toggleAuthMode : null}>
              {isLogin ? t.linkCreate : t.linkReturn}
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}