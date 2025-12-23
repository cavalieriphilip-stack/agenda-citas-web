// Detectar entorno (Local o Producción)
export const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:10000' 
    : 'https://agenda-cisd-panel.onrender.com';

// 🔐 Función auxiliar para cabeceras con Token
const getHeaders = (isMultipart = false) => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

// --- PROFESIONALES ---
export const getProfesionales = async () => {
    const res = await fetch(`${API_BASE_URL}/profesionales`, { headers: getHeaders() });
    return res.json();
};

export const updateProfesional = async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/profesionales/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
};

export const deleteProfesional = async (id) => {
    const res = await fetch(`${API_BASE_URL}/profesionales/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return res.json();
};

export const getHorariosByProfesional = async (id) => {
    // Esta ruta suele ser pública para la web de pacientes, pero enviamos headers por si acaso
    const res = await fetch(`${API_BASE_URL}/profesionales/${id}/horarios`);
    return res.json();
};

// --- PACIENTES ---
export const getPacientes = async () => {
    const res = await fetch(`${API_BASE_URL}/pacientes`, { headers: getHeaders() });
    return res.json();
};

export const buscarPacientePorRut = async (rut) => {
    const res = await fetch(`${API_BASE_URL}/pacientes/search/${rut}`, { headers: getHeaders() });
    return res.json();
};

export const crearPaciente = async (data) => {
    const res = await fetch(`${API_BASE_URL}/pacientes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear paciente');
    return res.json();
};

export const updatePaciente = async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/pacientes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
};

export const deletePaciente = async (id) => {
    await fetch(`${API_BASE_URL}/pacientes/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
};

// --- RESERVAS ---
export const getReservasDetalle = async () => {
    const res = await fetch(`${API_BASE_URL}/reservas/detalle`, { headers: getHeaders() });
    return res.json();
};

export const crearReserva = async (data) => {
    // Pública o Privada dependiendo de quién la llame, el backend maneja la excepción
    const res = await fetch(`${API_BASE_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Las reservas públicas no llevan token
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al reservar');
    return res.json();
};

export const cancelarReserva = async (id) => {
    await fetch(`${API_BASE_URL}/reservas/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
};

export const reagendarReserva = async (id, nuevoHorarioId, profesionalId, motivo) => {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}/reagendar`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ nuevoHorarioId, profesionalId, motivo })
    });
    if (!res.ok) throw new Error('Error al reagendar');
    return res.json();
};

// --- CONFIGURACIÓN ---
export const getConfiguraciones = async () => {
    const res = await fetch(`${API_BASE_URL}/configuracion`, { headers: getHeaders() });
    return res.json();
};

export const deleteConfiguracion = async (id) => {
    await fetch(`${API_BASE_URL}/configuracion/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
};