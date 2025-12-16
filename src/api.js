// src/api.js - PRODUCCIÓN RENDER ☁️
// Esta es la URL de tu backend en Render (copiada de tus fotos)
export const API_BASE_URL = 'https://agenda-citas-ienp.onrender.com';

export async function getPacientes() {
    const res = await fetch(`${API_BASE_URL}/pacientes`);
    return await res.json();
}

export async function buscarPacientePorRut(rut) {
    const rutLimpio = encodeURIComponent(rut); 
    const res = await fetch(`${API_BASE_URL}/pacientes/buscar/${rutLimpio}`);
    return await res.json(); 
}

export async function getProfesionales() {
    const res = await fetch(`${API_BASE_URL}/profesionales`);
    return await res.json();
}

// ACTUALIZAR PROFESIONAL (PUT)
export async function updateProfesional(id, data) {
    const res = await fetch(`${API_BASE_URL}/profesionales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar profesional');
    return await res.json();
}

// ELIMINAR PROFESIONAL (DELETE)
export async function deleteProfesional(id) {
    const res = await fetch(`${API_BASE_URL}/profesionales/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar profesional');
    return true;
}

export async function getHorariosByProfesional(id) {
    const res = await fetch(`${API_BASE_URL}/profesionales/${id}/horarios`);
    return await res.json();
}

export async function getReservasDetalle() {
    const res = await fetch(`${API_BASE_URL}/reservas/detalle`);
    return await res.json();
}

export async function getConfiguraciones() {
    const res = await fetch(`${API_BASE_URL}/configuracion`);
    return await res.json();
}

export async function deleteConfiguracion(id) {
    const res = await fetch(`${API_BASE_URL}/configuracion/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar config');
    return true;
}

export async function crearReserva(data) {
    const res = await fetch(`${API_BASE_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al reservar');
    return await res.json();
}

export async function crearPaciente(data) {
    const res = await fetch(`${API_BASE_URL}/pacientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear paciente');
    return await res.json();
}

export async function updatePaciente(id, data) {
    const res = await fetch(`${API_BASE_URL}/pacientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar paciente');
    return await res.json();
}

export async function deletePaciente(id) {
    const res = await fetch(`${API_BASE_URL}/pacientes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar paciente');
    return true;
}

export async function cancelarReserva(id) {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al cancelar');
    return true;
}

export async function reagendarReserva(id, nuevoHorarioId, nuevoProfesionalId, nuevoMotivo) {
    const res = await fetch(`${API_BASE_URL}/reservas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoHorarioId, nuevoProfesionalId, nuevoMotivo })
    });
    if (!res.ok) throw new Error('Error al reagendar');
    return await res.json();
}