// src/api.js

// Tomamos la URL base desde las variables de entorno de Vite.
// Si no existe, usamos localhost:3000 como respaldo.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Obtiene la lista de reservas con detalle desde la API.
 * GET /reservas/detalle
 */
async function getReservasDetalle() {
  const response = await fetch(`${API_BASE_URL}/reservas/detalle`);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Error al obtener reservas: ${response.status} ${response.statusText} ${text}`,
    );
  }

  return response.json();
}

/**
 * Cancela una reserva por id.
 * DELETE /reservas/:id
 */
async function cancelarReserva(id) {
  const response = await fetch(`${API_BASE_URL}/reservas/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg =
      data && data.error
        ? data.error
        : `Error al cancelar reserva (${response.status})`;
    throw new Error(msg);
  }

  return response.json();
}

export { API_BASE_URL, getReservasDetalle, cancelarReserva };
