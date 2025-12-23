import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';

const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

function Login() {
    const [form, setForm] = useState({ usuario: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await response.json();

            if (data.success) {
                // Guardar usuario y redirigir
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                navigate('/admin/dashboard'); // Redirige al panel principal
            } else {
                setError(data.message || 'Credenciales incorrectas');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-shell">
            <div className="login-card">
                <div style={{textAlign: 'center', marginBottom: 20}}>
                    <img src={LOGO_URL} alt="Logo CISD" className="login-logo" />
                </div>
                
                <h1 className="login-title">Acceso Portal</h1>
                <p className="login-subtitle">Gestión Clínica y Administrativa</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="form-label">Usuario</label>
                        <input 
                            type="text" 
                            name="usuario" 
                            className="form-control" 
                            value={form.usuario} 
                            onChange={handleChange} 
                            placeholder="Ingresa tu usuario" 
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label className="form-label">Contraseña</label>
                        <input 
                            type="password" 
                            name="password" 
                            className="form-control" 
                            value={form.password} 
                            onChange={handleChange} 
                            placeholder="••••••"
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="btn-primary" style={{width: '100%', marginTop: 10}} disabled={loading}>
                        {loading ? 'Ingresando...' : 'Ingresar al Portal'}
                    </button>
                </form>
            </div>
            
            <p className="login-footer">© 2025 CISD - Centro Integral de Salud Dreyse</p>
        </div>
    );
}

export default Login;