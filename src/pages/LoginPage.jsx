import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para el ojo
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = 'https://agenda-citas-ienp.onrender.com'; 
  const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      const data = await response.json();

      if (data.success && data.usuario && data.usuario.id) {
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        navigate('/admin/dashboard'); 
      } else {
        setError(data.message || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={LOGO_URL} alt="CISD Logo" className="login-logo" />
          <h1 className="login-title">Acceso Portal</h1>
          <p className="login-subtitle">Gestión Clínica y Administrativa</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input 
              type="text" 
              className="form-input"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej: Philip"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="password-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: '40px' }} // Espacio para el ojo
              />
              <button 
                type="button" 
                className="eye-btn" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  // Icono Ojo Abierto (SVG inline)
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                ) : (
                  // Icono Ojo Cerrado (SVG inline)
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar al Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;