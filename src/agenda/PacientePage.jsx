// src/pages/PacientePage.jsx

import { useEffect, useMemo, useState } from 'react';
import '../App.css';
import {
    getProfesionales,
    getHorariosByProfesional,
    crearPaciente,
    crearReserva,
} from '../api';

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

// ----------------------- TRATAMIENTOS -----------------------

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

// ----------------------- COMPONENTE -----------------------

export default function PacientePage() {
    const [profesionales, setProfesionales] = useState([]);
    const [flowHorariosPorProfesional, setFlowHorariosPorProfesional] = useState({});

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

    const [flowError, setFlowError] = useState('');
    const [flowSuccess, setFlowSuccess] = useState('');
    const [flowSubmitting, setFlowSubmitting] = useState(false);

    useEffect(() => {
        document.title = 'Agenda CISD - Agendar (Paciente)';
        cargarProfesionales();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function cargarProfesionales() {
        try {
            const pros = await getProfesionales();
            setProfesionales(pros);
        } catch (err) {
            console.error('Error cargando profesionales', err);
        }
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

    const especialidadesDisponibles = useMemo(() => {
        const set = new Set(TRATAMIENTOS.map((t) => t.especialidad));
        return Array.from(set);
    }, []);

    const tratamientosFiltrados = useMemo(() => {
        if (!flowData.especialidad) return [];
        return TRATAMIENTOS.filter((t) => t.especialidad === flowData.especialidad);
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
    }, [flowData.fechaSeleccionadaKey, flowHorariosPorProfesional, flowData.profesionalesIds]);

    function updateFlow(field, value) {
        setFlowData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleNextFromStep1() {
        setFlowError('');
        setFlowSuccess('');

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

    async function handleIrAgendaDisponible() {
        setFlowError('');
        setFlowSuccess('');

        if (!flowData.especialidad || !flowData.tratamientoId) {
            setFlowError('Selecciona especialidad y modalidad de atención.');
            return;
        }

        const tratamiento = TRATAMIENTOS.find((t) => t.id === flowData.tratamientoId);
        if (!tratamiento) {
            setFlowError('Tratamiento inválido.');
            return;
        }

        try {
            // Carga horarios de todos los profesionales del tratamiento (robusto)
            await Promise.all(
                (tratamiento.profesionalesIds || []).map((id) =>
                    cargarHorariosProfesionalFlujo(id)
                )
            );

            // Define día por defecto (primer día disponible)
            const dias = new Set();
            (tratamiento.profesionalesIds || []).forEach((proId) => {
                const horarios = flowHorariosPorProfesional[proId] || [];
                horarios.forEach((h) => dias.add(toDateKey(h.fecha)));
            });

            const fechaSeleccionadaKey = Array.from(dias).sort()[0] || '';

            setFlowData((prev) => ({
                ...prev,
                profesionalesIds: tratamiento.profesionalesIds,
                fechaSeleccionadaKey,
                profesionalId: '',
                horarioId: '',
            }));

            setFlowStep(2);
        } catch (err) {
            console.error(err);
            setFlowError('No se pudieron cargar horarios. Intenta nuevamente.');
        }
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
                            Agenda tu hora en pocos pasos.
                        </p>
                    </div>
                </div>

                {/* Mantengo layout, pero sin exponer API en vista pública */}
                <div className="api-pill" style={{ visibility: 'hidden' }}>
                    API: —
                </div>
            </header>

            <main className="app-main">
                <div className="main-content">
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
                            {flowSuccess && <div className="alert">{flowSuccess}</div>}

                            {/* PASO 1 */}
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

                            {/* PASO 2 */}
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
                                                    const trat = TRATAMIENTOS.find((t) => t.id === id);
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
                                            onClick={handleIrAgendaDisponible}
                                        >
                                            Ver agenda disponible
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PASO 3 */}
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
                                                    ? `Online · $${flowData.valor.toLocaleString('es-CL')}`
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
                                                        No hay horarios configurados para esta prestación.
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
                                                    const prof = profesionales.find((p) => p.id === proId);
                                                    const hs = horariosFiltradosFlujo[proId] || [];
                                                    if (!prof) return null;
                                                    return (
                                                        <div key={proId} className="profesional-card">
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
                                                                    <span style={{ fontSize: '0.75rem' }}>
                                                                        Sin horarios en este día.
                                                                    </span>
                                                                ) : (
                                                                    hs.map((h) => (
                                                                        <button
                                                                            key={h.id}
                                                                            type="button"
                                                                            className={`pro-time-chip${flowData.horarioId === h.id &&
                                                                                flowData.profesionalId === proId
                                                                                ? ' pro-time-chip--active'
                                                                                : ''
                                                                                }`}
                                                                            onClick={() => handleSelectHorario(proId, h.id)}
                                                                        >
                                                                            {new Date(h.fecha).toLocaleTimeString('es-CL', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                            })}
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                            <div className="pro-footer">
                                                                Horas disponibles este día: {hs.length}
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

                            {/* PASO 4 */}
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
                                                        const p = profesionales.find((x) => x.id === flowData.profesionalId);
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
                                                        const horarios = flowHorariosPorProfesional[proId] || [];
                                                        const h = horarios.find((x) => x.id === flowData.horarioId);
                                                        return h ? formatDateTime(h.fecha) : '—';
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="summary-row">
                                                <span className="summary-label">Valor:</span>
                                                <span className="summary-value">
                                                    {flowData.valor
                                                        ? `$${flowData.valor.toLocaleString('es-CL')}`
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
                                            {flowSubmitting ? 'Confirmando…' : 'Confirmar agendamiento'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
