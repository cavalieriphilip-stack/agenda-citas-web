// src/api.js
// Cliente HTTP simple para la API de Agenda CISD

export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!res.ok) {
        const text = await res.text();
        let msg = text || `Error ${res.status} en ${path}`;
        try {
            const parsed = JSON.parse(text);
            if (parsed?.message) msg = parsed.message;
        } catch (_) {
            // texto plano, no pasa nada
        }
        throw new Error(msg);
    }

    if (res.status === 204) return null;
    return res.json();
}

// PACIENTES
export function getPacientes() {
    return apiFetch('/pacientes');
}

export function crearPaciente(data) {
    return apiFetch('/pacientes', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// PROFESIONALES / HORARIOS
export function getProfesionales() {
    return apiFetch('/profesionales');
}

export function getHorariosByProfesional(id) {
    return apiFetch(`/profesionales/${id}/horarios`);
}

// RESERVAS
export function getReservasDetalle() {
    return apiFetch('/reservas/detalle');
}

export function crearReserva(data) {
    return apiFetch('/reservas', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function cancelarReserva(id) {
    return apiFetch(`/reservas/${id}`, {
        method: 'DELETE',
    });
}

export function reagendarReserva(id, nuevoHorarioDisponibleId) {
    return apiFetch(`/reservas/${id}/reagendar`, {
        method: 'PUT',
        body: JSON.stringify({ nuevoHorarioDisponibleId }),
    });
}
