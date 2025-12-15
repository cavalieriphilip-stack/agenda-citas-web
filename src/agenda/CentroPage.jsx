// src/pages/CentroPage.jsx

import { useEffect, useMemo, useState, Fragment } from 'react';
import '../App.css';
import {
    API_BASE_URL,
    getPacientes,
    getProfesionales,
    getHorariosByProfesional,
    getReservasDetalle,
    crearReserva,
    cancelarReserva,
    reagendarReserva,
} from '../api';

// ----------------------- UTILIDADES -----------------------

function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ----------------------- COMPONENTE -----------------------

export default function CentroPage() {
    const [pacientes, setPacientes] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [loadingInicial, setLoadingInicial] = useState(true);

    // Panel interno
    const [panelForm, setPanelForm] = useState({
        pacienteId: '',
        profesionalId: '',
        horarioId: '',
        motivo: '',
    });
    const [horariosPorProfesional, setHorariosPorProfesional] = useState({});
    const [panelSubmitting, setPanelSubmitting] = useState(false);
    const [panelError, setPanelError] = useState('');
    const [panelSuccess, setPanelSuccess] = useState('');
    const [cancelandoId, setCancelandoId] = useState(null);

    // Reagendar
    const [reagendandoId, setReagendandoId] = useState(null);
    const [reagendarHorarioId, setReagendarHorarioId] = useState('');
    const [reagendarError, setReagendarError] = useState('');
    const [reagendarLoading, setReagendarLoading] = useState(false);

    // ------------------ CARGA INICIAL ------------------

    useEffect(() => {
        document.title = 'Agenda CISD - Panel (Centro Médico)';
        cargarInicial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function cargarInicial() {
        try {
            setLoadingInicial(true);
            const [pacs, pros, resvs] = await Promise.all([
                getPacientes(),
                getProfesionales(),
                getReservasDetalle(),
            ]);
            setPacientes(pacs);
            setProfesionales(pros);
            setReservas(resvs);
        } catch (err) {
            console.error('Error cargando datos iniciales', err);
        } finally {
            setLoadingInicial(false);
        }
    }

    async function refrescarReservas() {
        try {
            const resvs = await getReservasDetalle();
            setReservas(resvs);
        } catch (err) {
            console.error('Error refrescando reservas', err);
        }
    }

    async function cargarHorariosProfesional(profesionalId) {
        if (!profesionalId) return [];
        if (horariosPorProfesional[profesionalId]) {
            return horariosPorProfesional[profesionalId];
        }
        const horarios = await getHorariosByProfesional(profesionalId);
        setHorariosPorProfesional((prev) => ({
            ...prev,
            [profesionalId]: horarios,
        }));
        return horarios;
    }

    // ------------------ PANEL INTERNO: handlers ------------------

    function handlePanelChange(field, value) {
        setPanelForm((prev) => ({
            ...prev,
            [field]: value,
            ...(field === 'profesionalId' ? { horarioId: '' } : null),
        }));

        if (field === 'profesionalId' && value) {
            cargarHorariosProfesional(parseInt(value, 10)).catch(console.error);
        }
    }

    async function handleCrearReservaPanel(e) {
        e.preventDefault();
        setPanelError('');
        setPanelSuccess('');

        const { pacienteId, profesionalId, horarioId, motivo } = panelForm;

        if (!pacienteId || !profesionalId || !horarioId || !motivo.trim()) {
            setPanelError('Completa paciente, profesional, horario y motivo.');
            return;
        }

        try {
            setPanelSubmitting(true);
            await crearReserva({
                pacienteId: parseInt(pacienteId, 10),
                profesionalId: parseInt(profesionalId, 10),
                horarioDisponibleId: parseInt(horarioId, 10),
                motivo: motivo.trim(),
            });
            setPanelForm({
                pacienteId: '',
                profesionalId: '',
                horarioId: '',
                motivo: '',
            });
            setPanelSuccess('Reserva creada correctamente.');
            await refrescarReservas();
        } catch (err) {
            setPanelError(err.message || 'Error al crear la reserva.');
        } finally {
            setPanelSubmitting(false);
        }
    }

    async function handleCancelarReserva(id) {
        if (!window.confirm('¿Seguro que quieres cancelar esta reserva?')) {
            return;
        }
        try {
            setCancelandoId(id);
            await cancelarReserva(id);
            await refrescarReservas();
        } catch (err) {
            alert(err.message || 'Error al cancelar la reserva.');
        } finally {
            setCancelandoId(null);
        }
    }

    async function handleAbrirReagendar(reserva) {
        setReagendarError('');
        setReagendandoId(reserva.id);
        setReagendarHorarioId(reserva.horarioDisponibleId?.toString() || '');
        try {
            await cargarHorariosProfesional(reserva.profesionalId);
        } catch (err) {
            setReagendarError('No se pudieron cargar los horarios del profesional.');
        }
    }

    function handleCerrarReagendar() {
        setReagendandoId(null);
        setReagendarHorarioId('');
        setReagendarError('');
    }

    async function handleConfirmarReagendar(reserva) {
        setReagendarError('');
        if (!reagendarHorarioId) {
            setReagendarError('Selecciona un nuevo horario para reagendar.');
            return;
        }

        try {
            setReagendarLoading(true);
            await reagendarReserva(reserva.id, parseInt(reagendarHorarioId, 10));
            await refrescarReservas();
            handleCerrarReagendar();
        } catch (err) {
            setReagendarError(err.message || 'Error al reagendar la reserva.');
        } finally {
            setReagendarLoading(false);
        }
    }

    const horariosProfesionalReagendar = useMemo(() => {
        if (!reagendandoId) return [];
        const reserva = reservas.find((r) => r.id === reagendandoId);
        if (!reserva) return [];
        return horariosPorProfesional[reserva.profesionalId] || [];
    }, [reagendandoId, reservas, horariosPorProfesional]);

    const horariosSelectPanel = useMemo(() => {
        const proId = panelForm.profesionalId ? parseInt(panelForm.profesionalId, 10) : null;
        if (!proId) return [];
        return horariosPorProfesional[proId] || [];
    }, [panelForm.profesionalId, horariosPorProfesional]);

    // ------------------ RENDER ------------------

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="app-header-left">
                    <div className="logo-circle">C</div>
                    <div>
                        <div className="app-kicker">
                            CISD · CENTRO INTEGRAL DE SALUD DREYSE
                        </div>
                        <h1 className="app-title">Agenda CISD</h1>
                        <p className="app-subtitle">
                            Panel interno de reservas para tu equipo clínico.
                        </p>
                    </div>
                </div>
                <div className="api-pill">
                    API:{' '}
                    <a href={API_BASE_URL} target="_blank" rel="noreferrer">
                        {API_BASE_URL}
                    </a>
                </div>
            </header>

            <main className="app-main">
                <div className="main-content">
                    <section className="panel-card">
                        {/* CREAR RESERVA */}
                        <div className="panel-section">
                            <div className="panel-section-header">
                                <h2>Crear nueva reserva</h2>
                                <p>
                                    Selecciona paciente, profesional y uno de sus horarios
                                    disponibles.
                                </p>
                            </div>

                            {panelError && (
                                <div className="alert alert--error">{panelError}</div>
                            )}
                            {panelSuccess && (
                                <div className="alert">{panelSuccess}</div>
                            )}

                            <form className="reserva-form" onSubmit={handleCrearReservaPanel}>
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label>Paciente</label>
                                        <select
                                            value={panelForm.pacienteId}
                                            onChange={(e) =>
                                                handlePanelChange('pacienteId', e.target.value)
                                            }
                                        >
                                            <option value="">Selecciona un paciente</option>
                                            {pacientes.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombreCompleto}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-field">
                                        <label>Profesional</label>
                                        <select
                                            value={panelForm.profesionalId}
                                            onChange={(e) =>
                                                handlePanelChange('profesionalId', e.target.value)
                                            }
                                        >
                                            <option value="">Selecciona un profesional</option>
                                            {profesionales.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombreCompleto} · {p.especialidad}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-field">
                                        <label>Horario</label>
                                        <select
                                            value={panelForm.horarioId}
                                            onChange={(e) =>
                                                handlePanelChange('horarioId', e.target.value)
                                            }
                                            disabled={!panelForm.profesionalId}
                                        >
                                            <option value="">
                                                {panelForm.profesionalId
                                                    ? 'Selecciona un horario disponible'
                                                    : 'Selecciona primero un profesional'}
                                            </option>
                                            {horariosSelectPanel.map((h) => (
                                                <option key={h.id} value={h.id}>
                                                    {formatDateTime(h.fecha)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-field">
                                        <label>Motivo de consulta</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Consulta de seguimiento, evaluación inicial…"
                                            value={panelForm.motivo}
                                            onChange={(e) =>
                                                handlePanelChange('motivo', e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <button
                                        type="submit"
                                        className="primary-btn"
                                        disabled={panelSubmitting}
                                    >
                                        {panelSubmitting ? 'Creando reserva…' : 'Crear reserva'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* LISTADO RESERVAS */}
                        <div className="panel-section" style={{ marginTop: 16 }}>
                            <div className="panel-section-header">
                                <h2>Reservas registradas</h2>
                                <p>
                                    Revisa y administra las reservas agendadas. Incluye los
                                    datos de contacto del paciente.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="ghost-btn"
                                onClick={refrescarReservas}
                                disabled={loadingInicial}
                            >
                                Actualizar
                            </button>

                            <div className="table-wrapper">
                                <table className="reservas-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Motivo</th>
                                            <th>Paciente</th>
                                            <th>Contacto paciente</th>
                                            <th>Profesional</th>
                                            <th>Especialidad</th>
                                            <th>Fecha</th>
                                            <th className="cell-actions">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reservas.length === 0 ? (
                                            <tr>
                                                <td colSpan={8}>No hay reservas registradas.</td>
                                            </tr>
                                        ) : (
                                            reservas.map((r) => (
                                                <Fragment key={r.id}>
                                                    <tr>
                                                        <td>{r.id}</td>
                                                        <td className="cell-motivo">{r.motivo}</td>
                                                        <td>{r.pacienteNombre}</td>
                                                        <td>
                                                            {r.pacienteTelefono && (
                                                                <div>{r.pacienteTelefono}</div>
                                                            )}
                                                            {r.pacienteEmail && (
                                                                <div>{r.pacienteEmail}</div>
                                                            )}
                                                            {!r.pacienteTelefono &&
                                                                !r.pacienteEmail &&
                                                                '—'}
                                                        </td>
                                                        <td>{r.profesionalNombre}</td>
                                                        <td>{r.especialidad}</td>
                                                        <td>{formatDateTime(r.fecha)}</td>
                                                        <td className="cell-actions">
                                                            <button
                                                                type="button"
                                                                className="ghost-btn"
                                                                style={{ marginRight: 4 }}
                                                                onClick={() => handleAbrirReagendar(r)}
                                                            >
                                                                Reagendar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="danger-btn"
                                                                onClick={() => handleCancelarReserva(r.id)}
                                                                disabled={cancelandoId === r.id}
                                                            >
                                                                {cancelandoId === r.id
                                                                    ? 'Cancelando…'
                                                                    : 'Cancelar'}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {reagendandoId === r.id && (
                                                        <tr key={`${r.id}-reagendar`}>
                                                            <td colSpan={8}>
                                                                <div
                                                                    style={{
                                                                        marginTop: 8,
                                                                        padding: 10,
                                                                        borderRadius: 10,
                                                                        border: '1px solid var(--border-soft)',
                                                                        backgroundColor: '#fafafa',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: 8,
                                                                    }}
                                                                >
                                                                    <strong>Reagendar reserva #{r.id}</strong>
                                                                    <div className="form-grid">
                                                                        <div className="form-field">
                                                                            <label>Nuevo horario</label>
                                                                            <select
                                                                                value={reagendarHorarioId}
                                                                                onChange={(e) =>
                                                                                    setReagendarHorarioId(
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            >
                                                                                <option value="">
                                                                                    Selecciona un nuevo horario
                                                                                </option>
                                                                                {horariosProfesionalReagendar.map(
                                                                                    (h) => (
                                                                                        <option
                                                                                            key={h.id}
                                                                                            value={h.id}
                                                                                        >
                                                                                            {formatDateTime(h.fecha)}
                                                                                        </option>
                                                                                    )
                                                                                )}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    {reagendarError && (
                                                                        <div className="alert alert--error">
                                                                            {reagendarError}
                                                                        </div>
                                                                    )}
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'flex-end',
                                                                            gap: 8,
                                                                        }}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            className="ghost-btn"
                                                                            onClick={handleCerrarReagendar}
                                                                            disabled={reagendarLoading}
                                                                        >
                                                                            Cerrar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="primary-btn"
                                                                            onClick={() =>
                                                                                handleConfirmarReagendar(r)
                                                                            }
                                                                            disabled={reagendarLoading}
                                                                        >
                                                                            {reagendarLoading
                                                                                ? 'Guardando…'
                                                                                : 'Guardar cambios'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
