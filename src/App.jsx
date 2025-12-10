// src/App.jsx
import { useEffect, useState } from "react";
import {
  getApiBaseUrl,
  fetchReservasDetalle,
  deleteReserva,
  fetchPacientes,
  fetchProfesionales,
  fetchHorariosByProfesional,
  createReserva,
} from "./api";
import "./App.css";

function formatFecha(fechaIso) {
  if (!fechaIso) return "-";
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function App() {
  const [apiBaseUrl] = useState(getApiBaseUrl());

  // Estado de reservas
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Estado para crear reserva
  const [pacientes, setPacientes] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pacienteId: "",
    profesionalId: "",
    horarioDisponibleId: "",
    motivo: "",
  });

  // Cargar reservas + catálogos al inicio
  useEffect(() => {
    actualizarReservas();
    cargarCatalogos();
  }, []);

  // Cuando cambia el profesional, cargamos sus horarios
  useEffect(() => {
    const profesionalId = parseInt(form.profesionalId, 10);
    if (!profesionalId || Number.isNaN(profesionalId)) {
      setHorarios([]);
      setForm((prev) => ({ ...prev, horarioDisponibleId: "" }));
      return;
    }

    const fetchHorarios = async () => {
      try {
        const data = await fetchHorariosByProfesional(profesionalId);
        setHorarios(data || []);
        setForm((prev) => ({
          ...prev,
          horarioDisponibleId: "",
        }));
      } catch (err) {
        console.error(err);
        setHorarios([]);
      }
    };

    fetchHorarios();
  }, [form.profesionalId]);

  async function actualizarReservas() {
    try {
      setLoading(true);
      setError("");
      const data = await fetchReservasDetalle();
      setReservas(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al obtener reservas");
    } finally {
      setLoading(false);
    }
  }

  async function cargarCatalogos() {
    try {
      const [pacs, profs] = await Promise.all([
        fetchPacientes(),
        fetchProfesionales(),
      ]);
      setPacientes(pacs || []);
      setProfesionales(profs || []);
    } catch (err) {
      console.error("Error al cargar catálogos", err);
      // No rompemos la app, solo no habrá selects bonitos
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCrearReserva(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const pacienteId = parseInt(form.pacienteId, 10);
    const profesionalId = parseInt(form.profesionalId, 10);
    const horarioDisponibleId = parseInt(form.horarioDisponibleId, 10);
    const motivo = form.motivo.trim();

    if (
      !pacienteId ||
      !profesionalId ||
      !horarioDisponibleId ||
      !motivo
    ) {
      setError(
        "Debes seleccionar paciente, profesional, horario y escribir un motivo.",
      );
      return;
    }

    try {
      setSaving(true);
      await createReserva({
        pacienteId,
        profesionalId,
        horarioDisponibleId,
        motivo,
      });

      setSuccessMessage("Reserva creada correctamente.");
      setForm({
        pacienteId: "",
        profesionalId: "",
        horarioDisponibleId: "",
        motivo: "",
      });

      await actualizarReservas();
      await cargarCatalogos(); // por si cambian horarios disponibles
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al crear la reserva.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelarReserva(id) {
    const confirmacion = window.confirm(
      `¿Seguro que quieres cancelar la reserva #${id}?`,
    );
    if (!confirmacion) return;

    try {
      setError("");
      setSuccessMessage("");
      await deleteReserva(id);
      setSuccessMessage("Reserva cancelada correctamente.");
      await actualizarReservas();
      await cargarCatalogos();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cancelar la reserva.");
    }
  }

  return (
    <div className="app-root">
      <div className="panel">
        <header className="panel-header">
          <div>
            <h1>Agenda CISD</h1>
            <p className="panel-subtitle">
              Panel de reservas (modo demo local / producción)
            </p>
          </div>
          <span className="api-pill">API: {apiBaseUrl}</span>
        </header>

        <section className="panel-toolbar">
          <button
            className="primary-button"
            onClick={actualizarReservas}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar reservas"}
          </button>
        </section>

        {error && <p className="status status-error">{error}</p>}
        {successMessage && (
          <p className="status status-success">{successMessage}</p>
        )}

        {/* FORMULARIO CREAR RESERVA */}
        <section className="form-section">
          <h2>Crear nueva reserva</h2>
          <p className="form-help">
            Selecciona paciente, profesional y uno de sus horarios disponibles.
          </p>

          <form className="create-form" onSubmit={handleCrearReserva}>
            <div className="form-row">
              <label htmlFor="pacienteId">Paciente</label>
              <select
                id="pacienteId"
                name="pacienteId"
                value={form.pacienteId}
                onChange={handleChange}
              >
                <option value="">Selecciona un paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.nombreCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="profesionalId">Profesional</label>
              <select
                id="profesionalId"
                name="profesionalId"
                value={form.profesionalId}
                onChange={handleChange}
              >
                <option value="">Selecciona un profesional</option>
                {profesionales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.nombreCompleto} ({p.especialidad})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="horarioDisponibleId">Horario</label>
              <select
                id="horarioDisponibleId"
                name="horarioDisponibleId"
                value={form.horarioDisponibleId}
                onChange={handleChange}
                disabled={!form.profesionalId || horarios.length === 0}
              >
                <option value="">
                  {form.profesionalId
                    ? horarios.length === 0
                      ? "Sin horarios disponibles"
                      : "Selecciona un horario"
                    : "Selecciona un profesional primero"}
                </option>
                {horarios.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.id} — {formatFecha(h.fecha)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row form-row-full">
              <label htmlFor="motivo">Motivo de consulta</label>
              <textarea
                id="motivo"
                name="motivo"
                rows={2}
                value={form.motivo}
                onChange={handleChange}
                placeholder="Ej: Consulta de seguimiento, evaluación inicial…"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Creando reserva..." : "Crear reserva"}
              </button>
            </div>
          </form>
        </section>

        {/* TABLA DE RESERVAS */}
        <section className="table-section">
          {reservas.length === 0 ? (
            <p className="empty-state">No hay reservas registradas.</p>
          ) : (
            <div className="table-wrapper">
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
                  {reservas.map((reserva) => (
                    <tr key={reserva.id}>
                      <td>{reserva.id}</td>
                      <td>{reserva.motivo}</td>
                      <td>{reserva.paciente?.nombreCompleto || "-"}</td>
                      <td>{reserva.profesional?.nombreCompleto || "-"}</td>
                      <td>{reserva.profesional?.especialidad || "-"}</td>
                      <td>
                        {formatFecha(
                          reserva.horarioDisponible?.fecha,
                        )}
                      </td>
                      <td>
                        <button
                          className="danger-button"
                          onClick={() =>
                            handleCancelarReserva(reserva.id)
                          }
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
