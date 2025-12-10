// src/App.jsx
import { useState } from 'react';

const API_BASE_URL = 'http://localhost:3000';

function App() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchReservas = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/reservas/detalle`);

      if (!response.ok) {
        let message = 'Error al obtener las reservas';
        try {
          const body = await response.json();
          if (body && body.error) message = body.error;
        } catch {
          // ignoramos error de parseo
        }
        throw new Error(message);
      }

      const data = await response.json();
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en fetchReservas:', err);
      setError(err.message || 'Error desconocido al obtener las reservas');
      setReservas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    const confirmar = window.confirm(
      '¿Seguro que deseas cancelar esta reserva?'
    );
    if (!confirmar) return;

    try {
      setCancellingId(id);
      setError('');

      const response = await fetch(`${API_BASE_URL}/reservas/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let message = 'Error al cancelar la reserva';
        try {
          const body = await response.json();
          if (body && body.error) message = body.error;
        } catch {
          // ignoramos error de parseo
        }
        throw new Error(message);
      }

      // Opcional: leer mensaje del backend (por ahora no lo usamos)
      await response.json().catch(() => null);

      // Volver a cargar la lista
      await fetchReservas();
    } catch (err) {
      console.error('Error en handleCancel:', err);
      setError(err.message || 'Error desconocido al cancelar la reserva');
    } finally {
      setCancellingId(null);
    }
  };

  const formatFecha = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#181818',
        color: '#f5f5f5',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '80px',
      }}
    >
      <div style={{ width: '90%', maxWidth: '1100px' }}>
        <h1
          style={{
            textAlign: 'center',
            fontSize: '3rem',
            marginBottom: '0.5rem',
          }}
        >
          Agenda CISD
        </h1>
        <p
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            color: '#cccccc',
          }}
        >
          Panel de reservas (modo demo local)
        </p>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={fetchReservas}
            disabled={loading}
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Cargando…' : 'Actualizar reservas'}
          </button>
        </div>

        {error && (
          <p
            style={{
              textAlign: 'center',
              color: '#ff6b6b',
              marginBottom: '1rem',
            }}
          >
            {error}
          </p>
        )}

        {reservas.length === 0 && !loading && !error && (
          <p style={{ textAlign: 'center', color: '#cccccc' }}>
            No hay reservas registradas.
          </p>
        )}

        {reservas.length > 0 && (
          <div
            style={{
              overflowX: 'auto',
              backgroundColor: '#202020',
              borderRadius: '10px',
              padding: '1rem',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.95rem',
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Motivo</th>
                  <th style={thStyle}>Paciente</th>
                  <th style={thStyle}>Profesional</th>
                  <th style={thStyle}>Especialidad</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => (
                  <tr key={reserva.id}>
                    <td style={tdStyle}>{reserva.id}</td>
                    <td style={tdStyle}>{reserva.motivo}</td>
                    <td style={tdStyle}>
                      {reserva.paciente?.nombreCompleto || '-'}
                    </td>
                    <td style={tdStyle}>
                      {reserva.profesional?.nombreCompleto || '-'}
                    </td>
                    <td style={tdStyle}>
                      {reserva.profesional?.especialidad || '-'}
                    </td>
                    <td style={tdStyle}>
                      {formatFecha(reserva.horarioDisponible?.fecha)}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleCancel(reserva.id)}
                        disabled={cancellingId === reserva.id}
                        style={{
                          backgroundColor: '#ff4b4b',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          cursor:
                            cancellingId === reserva.id
                              ? 'default'
                              : 'pointer',
                          opacity: cancellingId === reserva.id ? 0.7 : 1,
                        }}
                      >
                        {cancellingId === reserva.id
                          ? 'Cancelando…'
                          : 'Cancelar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '0.5rem',
  borderBottom: '1px solid #444',
  fontWeight: 600,
};

const tdStyle = {
  padding: '0.5rem',
  borderBottom: '1px solid #333',
};

export default App;
