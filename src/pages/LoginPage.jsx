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

        console.log("🚀 Enviando login a:", `${API_BASE_URL}/auth/login`);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' // Importante para que el server sepa qué queremos
                },
                body: JSON.stringify(form)
            });

            // 1. Leemos la respuesta como TEXTO primero para evitar el "Unexpected end of JSON"
            const textResponse = await response.text();
            console.log("📥 Respuesta cruda del servidor:", textResponse);

            // 2. Intentamos convertir a JSON
            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (jsonError) {
                // Si falla, es porque el server devolvió HTML o vacío
                throw new Error(`El servidor devolvió una respuesta inválida: "${textResponse.substring(0, 50)}..."`);
            }

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                navigate('/admin/dashboard'); 
            } else {
                setError(data.message || 'Credenciales incorrectas');
            }

        } catch (err) {
            console.error("🔥 Error en Login:", err);
            setError(err.message);
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
                        <input type="text" name="usuario" className="form-control" value={form.usuario} onChange={handleChange} placeholder="Ingresa tu usuario" autoFocus />
                    </div>
                    <div className="input-group">
                        <label className="form-label">Contraseña</label>
                        <input type="password" name="password" className="form-control" value={form.password} onChange={handleChange} placeholder="••••••" />
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