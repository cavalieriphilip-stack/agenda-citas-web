// src/api.js

// Resolvemos la base de la API según las variables de entorno de Vite
const API_BASE_URL = (() => {
  // 1) Entorno configurado (.env.development / .env.production / Render)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 2) Fallback útil en local si no está la variable
  if (typeof window !== "undefined") {
    const { origin } = window.location;
    if (origin.includes(":5173")) {
      // Vite -> API en 3000 por defecto
      return origin.replace(":5173", ":3000");
    }
    return origin;
  }

  // 3) Último recurso
  return "http://localhost:3000";
})();

export function getApiBaseUrl() {
  return API_BASE_URL;
}

async function handleResponse(res) {
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.mensaje) message = data.mensaje;
    } catch {
      // ignoramos errores de parseo
    }
    throw new Error(message);
  }

  // Algunas respuestas (DELETE) podrían no tener JSON
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// 🔍 Reservas con detalle
export async function fetchReservasDetalle() {
  const res = await fetch(`${API_BASE_URL}/reservas/detalle`);
  return handleResponse(res);
}

// ❌ Cancelar reserva
export async function deleteReserva(id) {
  const res = await fetch(`${API_BASE_URL}/reservas/${id}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

// 👤 Pacientes
export async function fetchPacientes() {
  const res = await fetch(`${API_BASE_URL}/pacientes`);
  return handleResponse(res);
}

// 👨‍⚕️ Profesionales
export async function fetchProfesionales() {
  const res = await fetch(`${API_BASE_URL}/profesionales`);
  return handleResponse(res);
}

// ⏰ Horarios por profesional
export async function fetchHorariosByProfesional(profesionalId) {
  const res = await fetch(
    `${API_BASE_URL}/profesionales/${profesionalId}/horarios`,
  );
  return handleResponse(res);
}

// ✅ Crear reserva
// payload: { pacienteId, profesionalId, horarioDisponibleId, motivo }
export async function createReserva(payload) {
  const res = await fetch(`${API_BASE_URL}/reservas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
