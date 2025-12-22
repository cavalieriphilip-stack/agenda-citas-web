// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ setUsuarioLogueado }) => { // Recibe la función para guardar el estado
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // ⚠️ Asegúrate de que esta URL sea la de tu Render Backend
  const API_URL = 'https://agenda-citas-ienp.onrender.com'; 

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      const data = await response.json();

      if (data.success) {
        // Guardamos al usuario en el navegador y en el estado
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        
        // Si pasaste una función para actualizar el estado global, úsala:
        if(setUsuarioLogueado) setUsuarioLogueado(data.usuario);
        
        // Redirigir al Admin
        navigate('/admin/dashboard'); 
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">CISD</h1>
          <p className="text-gray-500">Centro Integral de Salud Dreyse</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario</label>
            <input 
              type="text" 
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: f.dreyse"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <button 
            type="submit" 
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none"
          >
            Ingresar al Portal
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;