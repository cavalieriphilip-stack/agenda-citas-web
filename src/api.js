// Detectar entorno (Local o Producción)
export const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:10000' 
    : 'https://agenda-citas-ienp.onrender.com'; // ⚠️ Tu URL real de Render

// 🔐 HELPER: Obtener cabeceras con Token
const getHeaders = (isMultipart = false) => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

// ==========================================
// 📂 SUBIDA DE ARCHIVOS (NUEVO)
// ==========================================
export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    
    // NOTA: No seteamos Content-Type manual en multipart, el navegador lo hace con el boundary correcto
    const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}` 
        },
        body: formData
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al subir archivo');
    }
    return res.json(); // Retorna { url: '...', nombre: '...' }
};

// --- PROFESIONALES ---
export const getProfesionales = async () => { const res = await fetch(`${API_BASE_URL}/profesionales`, { headers: getHeaders() }); return res.json(); };
export const updateProfesional = async (id, data) => { const res = await fetch(`${API_BASE_URL}/profesionales/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }); return res.json(); };
export const deleteProfesional = async (id) => { const res = await fetch(`${API_BASE_URL}/profesionales/${id}`, { method: 'DELETE', headers: getHeaders() }); return res.json(); };
export const getHorariosByProfesional = async (id) => { const res = await fetch(`${API_BASE_URL}/profesionales/${id}/horarios`); return res.json(); };

// --- PACIENTES ---
export const getPacientes = async () => { const res = await fetch(`${API_BASE_URL}/pacientes`, { headers: getHeaders() }); return res.json(); };
export const buscarPacientePorRut = async (rut) => { const res = await fetch(`${API_BASE_URL}/pacientes/search/${rut}`, { headers: getHeaders() }); return res.json(); };
export const crearPaciente = async (data) => { const res = await fetch(`${API_BASE_URL}/pacientes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error('Error al crear'); return res.json(); };
export const updatePaciente = async (id, data) => { const res = await fetch(`${API_BASE_URL}/pacientes/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }); return res.json(); };
export const deletePaciente = async (id) => { await fetch(`${API_BASE_URL}/pacientes/${id}`, { method: 'DELETE', headers: getHeaders() }); };

// --- RESERVAS ---
export const getReservasDetalle = async () => { const res = await fetch(`${API_BASE_URL}/reservas/detalle`, { headers: getHeaders() }); return res.json(); };
export const crearReserva = async (data) => { const res = await fetch(`${API_BASE_URL}/reservas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error('Error al reservar'); return res.json(); };
export const cancelarReserva = async (id) => { await fetch(`${API_BASE_URL}/reservas/${id}`, { method: 'DELETE', headers: getHeaders() }); };
export const reagendarReserva = async (id, nuevoHorarioId, profesionalId, motivo) => { const res = await fetch(`${API_BASE_URL}/reservas/${id}/reagendar`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ nuevoHorarioId, profesionalId, motivo }) }); if (!res.ok) throw new Error('Error reagendar'); return res.json(); };

// --- CONFIGURACIÓN ---
export const getConfiguraciones = async () => { const res = await fetch(`${API_BASE_URL}/configuracion`, { headers: getHeaders() }); return res.json(); };
export const deleteConfiguracion = async (id) => { await fetch(`${API_BASE_URL}/configuracion/${id}`, { method: 'DELETE', headers: getHeaders() }); };