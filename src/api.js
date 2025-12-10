// src/api.js
// Helper centralizado para hablar con la API de agenda (back en Render o localhost)

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);

    if (!res.ok) {
      let errorBody = '';
      try {
        errorBody = await res.text();
      } catch {
        // ignore
      }
      const message =
        errorBody || `Error ${res.status} al llamar a ${path}`;
      throw new Error(message);
    }

    // Algunos endpoints (DELETE) devuelven sólo mensaje
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (err) {
    console.error('apiFetch error', err);
    throw err;
  }
}

// ------- ENDPOINTS ESPECÍFICOS -------

// Salud
export function getStatus() {
  return apiFetch('/status');
}

// Reservas
export function getReservasDetalle() {
  return apiFetch('/reservas/detalle');
}

export function createReserva(data) {
  return apiFetch('/reservas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteReserva(id) {
  return apiFetch(`/reservas/${id}`, {
    method: 'DELETE',
  });
}

// Pacientes
export function getPacientes() {
  return apiFetch('/pacientes');
}

export function createPaciente(data) {
  return apiFetch('/pacientes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Profesionales
export function getProfesionales() {
  return apiFetch('/profesionales');
}

export function getHorariosByProfesionalId(id) {
  return apiFetch(`/profesionales/${id}/horarios`);
}

// Helper: intenta reutilizar paciente por email si existe
export async function ensurePaciente({ nombreCompleto, email, telefono }) {
  const lista = await getPacientes();

  const existente =
    email &&
    Array.isArray(lista) &&
    lista.find(
      (p) =>
        typeof p.email === 'string' &&
        p.email.toLowerCase() === email.toLowerCase(),
    );

  if (existente) return existente;

  const creado = await createPaciente({
    nombreCompleto,
    email: email || null,
    telefono: telefono || null,
  });

  return creado;
}
