// src/App.jsx
import { useEffect, useState } from 'react';
import './App.css';
import {
  API_BASE_URL,
  getReservasDetalle,
  cancelarReserva,
} from './api';

function App() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [cancelandoId, setCancelandoId] = useState(null);

  async function cargarReservas() {
    try {
      setError('');
      setCargando(true);
      const data = await getReservasDetalle();
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al obtener reservas');
    } finally {
      setCargando(false);
    }
  }

  async function handleCancelar(id) {
    const confirmar = window.confirm(
      `¿Seguro que quieres cancelar la reserva #${id}?`,
    );
    if (!confirmar) return;

    try {
      setError('');
      setCancelandoId(id);
      await cancelarReserva(id);
      // Volvemos a cargar la lista
      await cargarReservas();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cancelar la reserva');
    } finally {
      setCancelandoId(null);
    }
  }

  // Cargar al montar
  useEffect(() => {
    cargarReservas();
  }, []);

  return (
    <div className="app-root">
      <div className="app-panel">
        <header className="app-header">
          <h1 className="app-title">Agenda CISD</h1>
          <p className="app-subtitle">
            Panel de reservas (modo demo local)
          </p>
        </header>

        <div className="app-toolbar">
          <button
            className="primary-button"
            onClick={cargarReservas}
            disabled={cargando}
          >
            {cargando ? 'Actualizando…' : 'Actualizar reservas'}
          </button>

          <span className="backend-tag">
            API:&nbsp;
            <code>{API_BASE_URL}</code>
          </span>
        </div>

        {error && <div className="error-text">{error}</div>}

        <section className="table-container">
          {reservas.length === 0 && !cargando ? (
            <p className="empty-text">No hay reservas registradas.</p>
          ) : (
            <table className="reservas-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Motivo</th>
                  <th>Paciente</th>
                  <th>Profesional</th>
                  <th>Especialidad</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => {
                  const fechaISO =
                    reserva.horarioDisponible?.fecha || null;
                  const fecha = fechaISO
                    ? new Date(fechaISO)
                    : null;

                  const fechaTexto = fecha
                    ? fecha.toLocaleString('es-CL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Sin fecha';

                  return (
                    <tr key={reserva.id}>
                      <td>{reserva.id}</td>
                      <td>{reserva.motivo}</td>
                      <td>{reserva.paciente?.nombreCompleto}</td>
                      <td>{reserva.profesional?.nombreCompleto}</td>
                      <td>{reserva.profesional?.especialidad}</td>
                      <td>{fechaTexto}</td>
                      <td>
                        <button
                          className="danger-button"
                          onClick={() => handleCancelar(reserva.id)}
                          disabled={cancelandoId === reserva.id}
                        >
                          {cancelandoId === reserva.id
                            ? 'Cancelando…'
                            : 'Cancelar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
