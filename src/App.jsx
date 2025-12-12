// src/App.jsx

import { useEffect, useMemo, useState, Fragment } from 'react';
import './App.css';
import {
    API_BASE_URL,
    getPacientes,
    getProfesionales,
    getHorariosByProfesional,
    getReservasDetalle,
    crearReserva,
    crearPaciente,
    cancelarReserva,
    reagendarReserva,
} from './api';

const PASOS_FLUJO = [
    'Datos personales',
    'Especialidad y modalidad',
    'Selección de día, profesional y horario',
    'Resumen y confirmación',
];

// ----------------------- UTILIDADES -----------------------

function limpiarRut(value) {
    return (value || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

function formatearRut(value) {
    const clean = limpiarRut(value);
    if (!clean) return '';
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    if (!cuerpo) return dv;

    const reversed = cuerpo.split('').reverse();
    const conPuntos = [];
    for (let i = 0; i < reversed.length; i++) {
        if (i > 0 && i % 3 === 0) conPuntos.push('.');
        conPuntos.push(reversed[i]);
    }
    const cuerpoFormateado = conPuntos.reverse().join('');
    return `${cuerpoFormateado}-${dv}`;
}

function esRutValido(rut) {
    const clean = limpiarRut(rut);
    if (clean.length < 2) return false;
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);

    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i], 10) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = suma % 11;
    const dvEsperado = 11 - resto;
    let dvCalc;
    if (dvEsperado === 11) dvCalc = '0';
    else if (dvEsperado === 10) dvCalc = 'K';
    else dvCalc = String(dvEsperado);
    return dvCalc === dv.toUpperCase();
}

function formatearTelefono(value) {
    const digits = (value || '').replace(/\D/g, '').slice(0, 9);
    if (!digits) return '';
    if (digits.length <= 1) return digits;
    if (digits.length <= 5) return `${digits[0]} ${digits.slice(1)}`;
    return `${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`;
}

function esTelefonoChilenoValido(value) {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length === 9 && digits.startsWith('9');
}

function esEmailValido(value) {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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

function formatShortDay(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
}

function formatShortDate(iso) {
    const d = new Date(iso);
    return d.getDate().toString().padStart(2, '0');
}

function toDateKey(iso) {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ----------------------- DATOS TRATAMIENTOS (RESUMEN) -----------------------

const TRATAMIENTOS = [
    {
        id: 'FON-INF-EVAL-ONLINE',
        especialidad: 'Fonoaudiología Infanto-Juvenil',
        categoria: 'Fonoaudiología Infanto-Juvenil',
        tratamiento: 'Evaluación fonoaudiológica infanto-juvenil online',
        codigoFonasa: '13-02-2003',
        descripcion: 'Evaluación de voz, habla y lenguaje',
        valor: 35000,
        profesionalesIds: [1, 2],
    },
    {
        id: 'FON-ADULTO-EVAL-ONLINE',
        especialidad: 'Fonoaudiología Adulto',
        categoria: 'Fonoaudiología Adulto',
        tratamiento: 'Evaluación fonoaudiológica adulto online',
        codigoFonasa: '13-02-2003',
        descripcion: 'Evaluación de voz, habla y lenguaje',
        valor: 35000,
        profesionalesIds: [1],
    },
    {
        id: 'PSI-ADULTO-ONLINE',
        especialidad: 'Psicología Adulto',
        categoria: 'Psicología Adulto',
        tratamiento: 'Evaluación Psicología Adulto online',
        codigoFonasa: '09-02-2001',
        descripcion: 'Psicodiagnóstico',
        valor: 30000,
        profesionalesIds: [3, 4],
    },
    {
        id: 'PSI-INFANTO-ONLINE',
        especialidad: 'Psicología Infanto-Juvenil',
        categoria: 'Psicología Infanto-Juvenil',
        tratamiento: 'Evaluación Psicología Infanto-Juvenil online',
        codigoFonasa: '09-02-2001',
        descripcion: 'Psicodiagnóstico',
        valor: 30000,
        profesionalesIds: [3, 4, 5],
    },
    {
        id: 'PACK-PSI-BIENESTAR',
        especialidad: 'Pack Psicologia',
        categoria: 'Pack Psicologia',
        tratamiento: 'Pack Bienestar Emocional (4 sesiones Psicologia online)',
        codigoFonasa: 'PACK-PSI',
        descripcion: 'Tratamiento Psicología Mensual (4 sesiones)',
        valor: 90000,
        profesionalesIds: [3, 4, 5],
    },
    {
        id: 'MAT-ADULTO-ONLINE',
        especialidad: 'Matrona Adulto Teleconsulta',
        categoria: 'Matrona',
        tratamiento: 'Consulta Matrona adulto online',
        codigoFonasa: '11-01-1942',
        descripcion: 'Consulta matrona',
        valor: 18000,
        profesionalesIds: [6],
    },
];

// ----------------------- COMPONENTE PRINCIPAL -----------------------

function App() {
    const [activeTab, setActiveTab] = useState('panel'); // 'panel' | 'flujo'

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

    // Flujo paciente
    const [flowStep, setFlowStep] = useState(0);
    const [flowData, setFlowData] = useState({
        nombreCompleto: '',
        rut: '',
        telefono: '',
        email: '',
        especialidad: '',
        tratamientoId: '',
        tratamientoLabel: '',
        codigoFonasa: '',
        valor: 0,
        profesionalesIds: [],
        profesionalId: '',
        horarioId: '',
        fechaSeleccionadaKey: '',
    });
    const [flowHorariosPorProfesional, setFlowHorariosPorProfesional] =
        useState({});
    const [flowError, setFlowError] = useState('');
    const [flowSuccess, setFlowSuccess] = useState('');
    const [flowSubmitting, setFlowSubmitting] = useState(false);

    // ------------------ CARGA INICIAL ------------------

    useEffect(() => {
        cargarInicial();
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

    async function cargarHorariosProfesionalFlujo(profesionalId) {
        if (!profesionalId) return [];
        if (flowHorariosPorProfesional[profesionalId]) {
            return flowHorariosPorProfesional[profesionalId];
        }
        const horarios = await getHorariosByProfesional(profesionalId);
        setFlowHorariosPorProfesional((prev) => ({
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

    // ------------------ FLUJO PACIENTE: DERIVADOS ------------------

    const especialidadesDisponibles = useMemo(() => {
        const set = new Set(TRATAMIENTOS.map((t) => t.especialidad));
        return Array.from(set);
    }, []);

    const tratamientosFiltrados = useMemo(() => {
        if (!flowData.especialidad) return [];
        return TRATAMIENTOS.filter(
            (t) => t.especialidad === flowData.especialidad
        );
    }, [flowData.especialidad]);

    const diasDisponiblesFlujo = useMemo(() => {
        const mapDias = new Map();
        flowData.profesionalesIds.forEach((proId) => {
            const horarios = flowHorariosPorProfesional[proId] || [];
            horarios.forEach((h) => {
                const key = toDateKey(h.fecha);
                if (!mapDias.has(key)) {
                    mapDias.set(key, { key, isoEjemplo: h.fecha });
                }
            });
        });
        const arr = Array.from(mapDias.values());
        arr.sort((a, b) => (a.key < b.key ? -1 : 1));
        return arr;
    }, [flowHorariosPorProfesional, flowData.profesionalesIds]);

    const horariosFiltradosFlujo = useMemo(() => {
        if (!flowData.fechaSeleccionadaKey) return {};
        const result = {};
        flowData.profesionalesIds.forEach((proId) => {
            const horarios = (flowHorariosPorProfesional[proId] || []).filter(
                (h) => toDateKey(h.fecha) === flowData.fechaSeleccionadaKey
            );
            if (horarios.length) {
                result[proId] = horarios;
            }
        });
        return result;
    }, [
        flowData.fechaSeleccionadaKey,
        flowHorariosPorProfesional,
        flowData.profesionalesIds,
    ]);

    // ------------------ FLUJO PACIENTE: handlers ------------------

    function updateFlow(field, value) {
        setFlowData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleNextFromStep1() {
        setFlowError('');
        const { nombreCompleto, rut, telefono, email } = flowData;

        if (!nombreCompleto.trim()) {
            setFlowError('Ingresa tu nombre completo.');
            return;
        }
        if (!esRutValido(rut)) {
            setFlowError('Ingresa un RUT chileno válido.');
            return;
        }
        if (!esTelefonoChilenoValido(telefono)) {
            setFlowError('Ingresa un teléfono chileno válido (9 dígitos).');
            return;
        }
        if (!esEmailValido(email)) {
            setFlowError('Ingresa un correo electrónico válido.');
            return;
        }

        setFlowStep(1);
    }

    function handleNextFromStep2() {
        setFlowError('');
        if (!flowData.especialidad || !flowData.tratamientoId) {
            setFlowError('Selecciona especialidad y modalidad de atención.');
            return;
        }
        setFlowStep(2);
    }

    async function handleEnterStep3() {
        setFlowError('');
        const tratamiento = TRATAMIENTOS.find(
            (t) => t.id === flowData.tratamientoId
        );
        if (!tratamiento) return;

        const proIds = tratamiento.profesionalesIds || [];
        for (const id of proIds) {
            // eslint-disable-next-line no-await-in-loop
            await cargarHorariosProfesionalFlujo(id);
        }

        const dias = [];
        tratamiento.profesionalesIds.forEach((proId) => {
            const horarios = flowHorariosPorProfesional[proId] || [];
            horarios.forEach((h) => {
                const key = toDateKey(h.fecha);
                if (!dias.includes(key)) dias.push(key);
            });
        });

        const fechaSeleccionadaKey = dias.sort()[0] || '';
        setFlowData((prev) => ({
            ...prev,
            profesionalesIds: tratamiento.profesionalesIds,
            fechaSeleccionadaKey,
            profesionalId: '',
            horarioId: '',
        }));
    }

    function handleSelectDia(key) {
        setFlowData((prev) => ({
            ...prev,
            fechaSeleccionadaKey: key,
            profesionalId: '',
            horarioId: '',
        }));
    }

    function handleSelectHorario(proId, horarioId) {
        setFlowData((prev) => ({
            ...prev,
            profesionalId: proId,
            horarioId,
        }));
    }

    function handleNextFromStep3() {
        setFlowError('');
        if (!flowData.profesionalId || !flowData.horarioId) {
            setFlowError('Selecciona un profesional y un horario disponible.');
            return;
        }
        setFlowStep(3);
    }

    async function handleConfirmarAgendamiento() {
        setFlowError('');
        setFlowSuccess('');

        if (!flowData.profesionalId || !flowData.horarioId) {
            setFlowError('Falta seleccionar profesional y horario.');
            return;
        }

        try {
            setFlowSubmitting(true);

            const paciente = await crearPaciente({
                nombreCompleto: flowData.nombreCompleto.trim(),
                email: flowData.email.trim(),
                telefono: flowData.telefono.replace(/\D/g, ''),
            });

            const motivo = `[Flujo paciente] [${flowData.tratamientoLabel}] ${flowData.rut} - ${flowData.nombreCompleto}`;

            await crearReserva({
                pacienteId: paciente.id,
                profesionalId: flowData.profesionalId,
                horarioDisponibleId: flowData.horarioId,
                motivo,
            });

            await cargarInicial();
            setFlowSuccess('Tu hora fue agendada correctamente.');
            setFlowStep(0);
            setFlowData({
                nombreCompleto: '',
                rut: '',
                telefono: '',
                email: '',
                especialidad: '',
                tratamientoId: '',
                tratamientoLabel: '',
                codigoFonasa: '',
                valor: 0,
                profesionalesIds: [],
                profesionalId: '',
                horarioId: '',
                fechaSeleccionadaKey: '',
            });
        } catch (err) {
            setFlowError(err.message || 'Error al confirmar la reserva.');
        } finally {
            setFlowSubmitting(false);
        }
    }

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
                    <div className="tabs">
                        <button
                            type="button"
                            className={
                                activeTab === 'panel' ? 'tab-btn tab-btn--active' : 'tab-btn'
                            }
                            onClick={() => setActiveTab('panel')}
                        >
                            Panel interno
                        </button>
                        <button
                            type="button"
                            className={
                                activeTab === 'flujo' ? 'tab-btn tab-btn--active' : 'tab-btn'
                            }
                            onClick={() => setActiveTab('flujo')}
                        >
                            Flujo paciente
                        </button>
                    </div>

                    {activeTab === 'panel' ? (
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
                                                {(horariosPorProfesional[
                                                    panelForm.profesionalId
                                                        ? parseInt(panelForm.profesionalId, 10)
                                                        : -1
                                                ] || []
                                                ).map((h) => (
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
                    ) : (
                        // ------------------ FLUJO PACIENTE ------------------
                        <section className="panel-card">
                            <div className="panel-section">
                                <div className="panel-section-header">
                                    <h2>Agenda tu hora</h2>
                                    <p>
                                        Completa tus datos, elige especialidad y modalidad de
                                        atención y luego selecciona día, profesional y horario.
                                    </p>
                                </div>

                                {/* TIMELINE */}
                                <div className="steps-timeline">
                                    <div className="steps-line-base">
                                        <div
                                            className="steps-line-fill"
                                            style={{
                                                width: `${(flowStep / (PASOS_FLUJO.length - 1)) * 100
                                                    }%`,
                                            }}
                                        />
                                    </div>
                                    <div className="steps-nodes">
                                        {PASOS_FLUJO.map((_, idx) => {
                                            const status =
                                                idx === flowStep
                                                    ? 'active'
                                                    : idx < flowStep
                                                        ? 'done'
                                                        : '';
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`steps-node${status ? ` steps-node--${status}` : ''
                                                        }`}
                                                >
                                                    {idx + 1}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="steps-labels">
                                        {PASOS_FLUJO.map((label, idx) => {
                                            const status =
                                                idx === flowStep
                                                    ? 'active'
                                                    : idx < flowStep
                                                        ? 'done'
                                                        : '';
                                            return (
                                                <div
                                                    key={label}
                                                    className={`steps-label${status ? ` steps-label--${status}` : ''
                                                        }`}
                                                >
                                                    {label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {flowError && (
                                    <div className="alert alert--error">{flowError}</div>
                                )}
                                {flowSuccess && (
                                    <div className="alert">{flowSuccess}</div>
                                )}

                                {/* CONTENIDO DE CADA PASO */}
                                {flowStep === 0 && (
                                    <div className="reserva-form">
                                        <div className="form-grid">
                                            <div className="form-field">
                                                <label>Nombre completo</label>
                                                <input
                                                    type="text"
                                                    placeholder="Nombre Apellido"
                                                    value={flowData.nombreCompleto}
                                                    onChange={(e) =>
                                                        updateFlow('nombreCompleto', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>RUT</label>
                                                <input
                                                    type="text"
                                                    placeholder="12.345.678-9"
                                                    value={flowData.rut}
                                                    onChange={(e) =>
                                                        updateFlow('rut', formatearRut(e.target.value))
                                                    }
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>Teléfono</label>
                                                <input
                                                    type="text"
                                                    placeholder="9 1234 5678"
                                                    value={flowData.telefono}
                                                    onChange={(e) =>
                                                        updateFlow(
                                                            'telefono',
                                                            formatearTelefono(e.target.value),
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>Correo electrónico</label>
                                                <input
                                                    type="email"
                                                    placeholder="correo@dominio.cl"
                                                    value={flowData.email}
                                                    onChange={(e) =>
                                                        updateFlow('email', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="step-actions">
                                            <button
                                                type="button"
                                                className="primary-btn"
                                                onClick={handleNextFromStep1}
                                            >
                                                Continuar a especialidad
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {flowStep === 1 && (
                                    <div className="reserva-form">
                                        <div className="form-grid">
                                            <div className="form-field">
                                                <label>Especialidad</label>
                                                <select
                                                    value={flowData.especialidad}
                                                    onChange={(e) =>
                                                        updateFlow('especialidad', e.target.value)
                                                    }
                                                >
                                                    <option value="">Selecciona especialidad</option>
                                                    {especialidadesDisponibles.map((esp) => (
                                                        <option key={esp} value={esp}>
                                                            {esp}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>Modalidad / Tratamiento</label>
                                                <select
                                                    value={flowData.tratamientoId}
                                                    onChange={(e) => {
                                                        const id = e.target.value;
                                                        const trat = TRATAMIENTOS.find(
                                                            (t) => t.id === id
                                                        );
                                                        updateFlow('tratamientoId', id);
                                                        if (trat) {
                                                            setFlowData((prev) => ({
                                                                ...prev,
                                                                tratamientoLabel: trat.tratamiento,
                                                                codigoFonasa: trat.codigoFonasa,
                                                                valor: trat.valor,
                                                                profesionalesIds: trat.profesionalesIds,
                                                                profesionalId: '',
                                                                horarioId: '',
                                                                fechaSeleccionadaKey: '',
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    <option value="">
                                                        Selecciona modalidad de atención
                                                    </option>
                                                    {tratamientosFiltrados.map((t) => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.tratamiento}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="step-actions">
                                            <button
                                                type="button"
                                                className="ghost-btn"
                                                onClick={() => setFlowStep(0)}
                                            >
                                                Volver
                                            </button>
                                            <button
                                                type="button"
                                                className="primary-btn"
                                                onClick={() => {
                                                    handleNextFromStep2();
                                                    if (!flowError) {
                                                        handleEnterStep3().catch(console.error);
                                                    }
                                                }}
                                            >
                                                Ver agenda disponible
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {flowStep === 2 && (
                                    <div className="reserva-form">
                                        <div className="summary-card">
                                            <div className="summary-row">
                                                <span className="summary-label">Especialidad:</span>
                                                <span className="summary-value">
                                                    {flowData.especialidad || '—'}
                                                </span>
                                            </div>
                                            <div className="summary-row">
                                                <span className="summary-label">
                                                    Tratamiento:
                                                </span>
                                                <span className="summary-value">
                                                    {flowData.tratamientoLabel || '—'}
                                                </span>
                                            </div>
                                            <div className="summary-row">
                                                <span className="summary-label">
                                                    Modalidad / valor:
                                                </span>
                                                <span className="summary-value">
                                                    {flowData.valor
                                                        ? `Online · $${flowData.valor.toLocaleString(
                                                            'es-CL'
                                                        )}`
                                                        : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="step-3-layout" style={{ marginTop: 12 }}>
                                            <div>
                                                <div className="dia-selector-title">
                                                    Selecciona día
                                                </div>
                                                <div className="day-strip">
                                                    {diasDisponiblesFlujo.map((d) => (
                                                        <button
                                                            key={d.key}
                                                            type="button"
                                                            className={`day-chip${flowData.fechaSeleccionadaKey === d.key
                                                                    ? ' day-chip--active'
                                                                    : ''
                                                                }`}
                                                            onClick={() => handleSelectDia(d.key)}
                                                        >
                                                            <span className="day-chip-weekday">
                                                                {formatShortDay(d.isoEjemplo)}
                                                            </span>
                                                            <span className="day-chip-date">
                                                                {formatShortDate(d.isoEjemplo)}
                                                            </span>
                                                        </button>
                                                    ))}
                                                    {diasDisponiblesFlujo.length === 0 && (
                                                        <span style={{ fontSize: '0.8rem' }}>
                                                            No hay horarios configurados para esta
                                                            prestación.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="profesionales-block">
                                                <div className="profesionales-title">
                                                    Profesionales y horarios
                                                </div>
                                                <div className="profesionales-grid">
                                                    {flowData.profesionalesIds.map((proId) => {
                                                        const prof = profesionales.find(
                                                            (p) => p.id === proId
                                                        );
                                                        const hs =
                                                            horariosFiltradosFlujo[proId] || [];
                                                        if (!prof) return null;
                                                        return (
                                                            <div
                                                                key={proId}
                                                                className="profesional-card"
                                                            >
                                                                <div className="profesional-header">
                                                                    <div className="pro-avatar">
                                                                        {prof.nombreCompleto
                                                                            .split(' ')
                                                                            .map((w) => w[0])
                                                                            .join('')
                                                                            .slice(0, 2)
                                                                            .toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="pro-info-main">
                                                                            {prof.nombreCompleto}
                                                                        </div>
                                                                        <div className="pro-info-sub">
                                                                            {prof.especialidad}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="pro-times">
                                                                    {hs.length === 0 ? (
                                                                        <span
                                                                            style={{ fontSize: '0.75rem' }}
                                                                        >
                                                                            Sin horarios en este día.
                                                                        </span>
                                                                    ) : (
                                                                        hs.map((h) => (
                                                                            <button
                                                                                key={h.id}
                                                                                type="button"
                                                                                className={`pro-time-chip${flowData.horarioId === h.id &&
                                                                                        flowData.profesionalId ===
                                                                                        proId
                                                                                        ? ' pro-time-chip--active'
                                                                                        : ''
                                                                                    }`}
                                                                                onClick={() =>
                                                                                    handleSelectHorario(
                                                                                        proId,
                                                                                        h.id
                                                                                    )
                                                                                }
                                                                            >
                                                                                {new Date(
                                                                                    h.fecha
                                                                                ).toLocaleTimeString('es-CL', {
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit',
                                                                                })}
                                                                            </button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                                <div className="pro-footer">
                                                                    Horas disponibles este día:{' '}
                                                                    {hs.length}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="step-actions">
                                            <button
                                                type="button"
                                                className="ghost-btn"
                                                onClick={() => setFlowStep(1)}
                                            >
                                                Volver
                                            </button>
                                            <button
                                                type="button"
                                                className="primary-btn"
                                                onClick={handleNextFromStep3}
                                            >
                                                Ir a resumen
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {flowStep === 3 && (
                                    <div className="reserva-form">
                                        <div className="summary-grid">
                                            <div className="summary-card">
                                                <div className="summary-title">
                                                    Datos personales
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Nombre:
                                                    </span>
                                                    <span className="summary-value">
                                                        {flowData.nombreCompleto || '—'}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">RUT:</span>
                                                    <span className="summary-value">
                                                        {flowData.rut || '—'}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Teléfono:
                                                    </span>
                                                    <span className="summary-value">
                                                        {flowData.telefono || '—'}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Correo:
                                                    </span>
                                                    <span className="summary-value">
                                                        {flowData.email || '—'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="summary-card">
                                                <div className="summary-title">
                                                    Detalle de la cita
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Especialidad:
                                                    </span>
                                                    <span className="summary-value">
                                                        {flowData.especialidad || '—'}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Tratamiento:
                                                    </span>
                                                    <span className="summary-value">
                                                        {flowData.tratamientoLabel || '—'}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Código Fonasa:
                                                    </span>
                                                    <span className="summary-value">
                                                        {flowData.codigoFonasa || '—'}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Profesional:
                                                    </span>
                                                    <span className="summary-value">
                                                        {(() => {
                                                            const p = profesionales.find(
                                                                (x) => x.id === flowData.profesionalId
                                                            );
                                                            return p?.nombreCompleto || '—';
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        Fecha / hora:
                                                    </span>
                                                    <span className="summary-value">
                                                        {(() => {
                                                            const proId = flowData.profesionalId;
                                                            const horarios =
                                                                flowHorariosPorProfesional[proId] || [];
                                                            const h = horarios.find(
                                                                (x) => x.id === flowData.horarioId
                                                            );
                                                            return h ? formatDateTime(h.fecha) : '—';
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="summary-row">
                                                    <span className="summary-label">Valor:</span>
                                                    <span className="summary-value">
                                                        {flowData.valor
                                                            ? `$${flowData.valor.toLocaleString(
                                                                'es-CL'
                                                            )}`
                                                            : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="muted-text">
                                            En el siguiente paso podrás integrar una pasarela de
                                            pago para confirmar tu reserva automáticamente.
                                        </p>

                                        <div className="step-actions">
                                            <button
                                                type="button"
                                                className="ghost-btn"
                                                onClick={() => setFlowStep(2)}
                                                disabled={flowSubmitting}
                                            >
                                                Volver
                                            </button>
                                            <button
                                                type="button"
                                                className="primary-btn"
                                                onClick={handleConfirmarAgendamiento}
                                                disabled={flowSubmitting}
                                            >
                                                {flowSubmitting
                                                    ? 'Confirmando…'
                                                    : 'Confirmar agendamiento'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
