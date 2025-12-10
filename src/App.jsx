// src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  API_BASE_URL,
  getReservasDetalle,
  deleteReserva,
  createReserva,
  getPacientes,
  getProfesionales,
  getHorariosByProfesionalId,
  ensurePaciente,
} from './api';

// ----------------------------------------------------------------------
// Catálogo de prestaciones (simplificado como ejemplo)
// ----------------------------------------------------------------------
const SERVICIOS = [
  {
    id: 'fono-adulto-eval-online',
    especialidad: 'Fonoaudiología Adulto',
    categoria: 'Evaluación',
    modalidad: 'Online',
    tratamiento: 'Evaluación fonoaudiológica adulto online',
    codigo: '13-02-003',
    descripcion: 'Evaluación de voz, habla y lenguaje',
    valor: '$20.000',
    profesionales: ['Bastián Miró', 'Fernanda Dreyse'],
  },
  {
    id: 'psico-adulto-consulta-online',
    especialidad: 'Psicología Adulto',
    categoria: 'Consulta',
    modalidad: 'Online',
    tratamiento: 'Consulta Psicología Adulto online',
    codigo: '09-02-2001',
    descripcion: 'Psicodiagnóstico / Psicoterapia individual',
    valor: '$25.000',
    profesionales: ['Antonia Vásquez', 'Javiera Ayala'],
  },
  {
    id: 'psico-infanto-eval-presencial',
    especialidad: 'Psicología Infanto-Juvenil',
    categoria: 'Evaluación',
    modalidad: 'Presencial',
    tratamiento:
      'Evaluación Psicología Infanto-juvenil presencial - Stgo Centro',
    codigo: '09-02-2002',
    descripcion: 'Psicodiagnóstico infanto-juvenil',
    valor: '$35.000',
    profesionales: ['Antonia Vásquez', 'Centro Amida'],
  },
  {
    id: 'matrona-adulto-teleconsulta',
    especialidad: 'Matrona Adulto Teleconsulta',
    categoria: 'Consulta',
    modalidad: 'Online',
    tratamiento: 'Consulta Matrona adulto teleconsulta',
    codigo: '11-01-1942',
    descripcion: 'Consulta Matrona Online',
    valor: '$18.000',
    profesionales: ['Katerine Navarrete'],
  },
];

const unique = (arr) => [...new Set(arr)];

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------
function App() {
  const [activeTab, setActiveTab] = useState('admin');

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-left">
          <img
            src="https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png"
            alt="Centro Integral de Salud Dreyse"
            className="app-logo"
          />
          <div className="app-title-block">
            <h1 className="app-title">Agenda CISD</h1>
            <p className="app-subtitle">
              Panel de reservas (modo demo local / producción)
            </p>
          </div>
        </div>

        <div className="api-badge">
          API:&nbsp;
          <span>{API_BASE_URL}</span>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'admin' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          Panel interno
        </button>
        <button
          className={`tab ${
            activeTab === 'paciente' ? 'tab--active' : ''
          }`}
          onClick={() => setActiveTab('paciente')}
        >
          Flujo paciente
        </button>
      </div>

      <main className="app-content">
        {activeTab === 'admin' ? <AdminPanel /> : <PatientFlow />}
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// PANEL INTERNO
// ----------------------------------------------------------------------
function AdminPanel() {
  const [reservas, setReservas] = useState([]);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [errorReservas, setErrorReservas] = useState('');

  const [pacientes, setPacientes] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [horariosProfesional, setHorariosProfesional] = useState([]);

  const [nuevo, setNuevo] = useState({
    pacienteId: '',
    profesionalId: '',
    horarioId: '',
    motivo: '',
  });

  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setLoadingReservas(true);
    setErrorReservas('');
    try {
      const [r, p, pro] = await Promise.all([
        getReservasDetalle(),
        getPacientes(),
        getProfesionales(),
      ]);
      setReservas(Array.isArray(r) ? r : []);
      setPacientes(Array.isArray(p) ? p : []);
      setProfesionales(Array.isArray(pro) ? pro : []);
    } catch (err) {
      console.error(err);
      setErrorReservas('Error al cargar datos. Revisa la consola.');
    } finally {
      setLoadingReservas(false);
    }
  }

  async function handleProfesionalChange(id) {
    setNuevo((prev) => ({
      ...prev,
      profesionalId: id,
      horarioId: '',
    }));
    setHorariosProfesional([]);
    if (!id) return;
    try {
      const horarios = await getHorariosByProfesionalId(Number(id));
      setHorariosProfesional(Array.isArray(horarios) ? horarios : []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCrearReserva(e) {
    e.preventDefault();
    setFeedback('');

    const { pacienteId, profesionalId, horarioId, motivo } = nuevo;

    if (!pacienteId || !profesionalId || !horarioId) {
      setFeedback('Completa paciente, profesional y horario.');
      return;
    }

    try {
      setCreating(true);
      await createReserva({
        pacienteId: Number(pacienteId),
        profesionalId: Number(profesionalId),
        horarioDisponibleId: Number(horarioId),
        motivo: motivo || 'Reserva creada desde panel interno',
      });
      setFeedback('Reserva creada correctamente.');
      setNuevo({
        pacienteId: '',
        profesionalId: '',
        horarioId: '',
        motivo: '',
      });
      await cargarTodo();
    } catch (err) {
      console.error(err);
      setFeedback('Error al crear la reserva.');
    } finally {
      setCreating(false);
    }
  }

  async function handleCancelar(id) {
    if (!window.confirm('¿Cancelar esta reserva?')) return;
    try {
      await deleteReserva(id);
      await cargarTodo();
    } catch (err) {
      console.error(err);
      alert('Error al cancelar reserva');
    }
  }

  return (
    <div className="panel">
      <section className="panel-section">
        <div className="panel-section-header">
          <h2>Crear nueva reserva</h2>
          <p className="panel-section-subtitle">
            Selecciona paciente, profesional y uno de sus horarios
            disponibles.
          </p>
        </div>

        <form className="form-grid" onSubmit={handleCrearReserva}>
          <div className="form-field">
            <label>Paciente</label>
            <select
              value={nuevo.pacienteId}
              onChange={(e) =>
                setNuevo((prev) => ({
                  ...prev,
                  pacienteId: e.target.value,
                }))
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
              value={nuevo.profesionalId}
              onChange={(e) => handleProfesionalChange(e.target.value)}
            >
              <option value="">Selecciona un profesional</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreCompleto} ({p.especialidad})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Horario</label>
            <select
              value={nuevo.horarioId}
              onChange={(e) =>
                setNuevo((prev) => ({ ...prev, horarioId: e.target.value }))
              }
              disabled={!nuevo.profesionalId}
            >
              <option value="">
                {nuevo.profesionalId
                  ? 'Selecciona un horario'
                  : 'Selecciona un profesional primero'}
              </option>
              {horariosProfesional.map((h) => (
                <option key={h.id} value={h.id}>
                  {new Date(h.fecha).toLocaleString('es-CL', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field form-field-full">
            <label>Motivo de consulta</label>
            <textarea
              rows={2}
              placeholder="Ej: Consulta de seguimiento, evaluación inicial…"
              value={nuevo.motivo}
              onChange={(e) =>
                setNuevo((prev) => ({ ...prev, motivo: e.target.value }))
              }
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? 'Creando…' : 'Crear reserva'}
            </button>
            {feedback && <p className="feedback-text">{feedback}</p>}
          </div>
        </form>
      </section>

      <section className="panel-section">
        <div className="panel-section-header">
          <h2>Reservas registradas</h2>
        </div>

        {loadingReservas ? (
          <p>Cargando reservas…</p>
        ) : errorReservas ? (
          <p className="error-text">{errorReservas}</p>
        ) : reservas.length === 0 ? (
          <p>No hay reservas registradas.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Motivo</th>
                  <th>Paciente</th>
                  <th>Profesional</th>
                  <th>Especialidad</th>
                  <th>Fecha</th>
                  <th className="table-col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.motivo}</td>
                    <td>{r.paciente?.nombreCompleto || '-'}</td>
                    <td>{r.profesional?.nombreCompleto || '-'}</td>
                    <td>{r.profesional?.especialidad || '-'}</td>
                    <td>
                      {r.horarioDisponible?.fecha
                        ? new Date(
                            r.horarioDisponible.fecha,
                          ).toLocaleString('es-CL', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '-'}
                    </td>
                    <td className="table-col-actions">
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleCancelar(r.id)}
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
  );
}

// ----------------------------------------------------------------------
// FLUJO PACIENTE
// ----------------------------------------------------------------------
function PatientFlow() {
  const [step, setStep] = useState(1);

  const [pacienteForm, setPacienteForm] = useState({
    nombreCompleto: '',
    rut: '',
    telefono: '',
    email: '',
  });

  const [especialidad, setEspecialidad] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [servicioId, setServicioId] = useState('');

  const [profesionalesApi, setProfesionalesApi] = useState([]);
  const [proHorarios, setProHorarios] = useState([]);
  const [seleccion, setSeleccion] = useState({
    profesionalId: null,
    horario: null,
  });

  const [loadingStep, setLoadingStep] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const pros = await getProfesionales();
        setProfesionalesApi(Array.isArray(pros) ? pros : []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const especialidadesDisponibles = useMemo(
    () => unique(SERVICIOS.map((s) => s.especialidad)),
    [],
  );

  const modalidadesDisponibles = useMemo(() => {
    if (!especialidad) return [];
    return unique(
      SERVICIOS.filter((s) => s.especialidad === especialidad).map(
        (s) => s.modalidad,
      ),
    );
  }, [especialidad]);

  const tratamientosDisponibles = useMemo(() => {
    if (!especialidad || !modalidad) return [];
    return SERVICIOS.filter(
      (s) =>
        s.especialidad === especialidad && s.modalidad === modalidad,
    );
  }, [especialidad, modalidad]);

  const servicioSeleccionado = useMemo(
    () => SERVICIOS.find((s) => s.id === servicioId) || null,
    [servicioId],
  );

  function nextStep() {
    setError('');
    setSuccessMsg('');
    setStep((prev) => Math.min(prev + 1, 4));
  }
  function prevStep() {
    setError('');
    setSuccessMsg('');
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function canGoStep2() {
    const { nombreCompleto, rut, telefono, email } = pacienteForm;
    return (
      nombreCompleto.trim() &&
      rut.trim() &&
      telefono.trim() &&
      email.trim()
    );
  }

  function canGoStep3() {
    return !!servicioSeleccionado;
  }

  function canConfirm() {
    return (
      servicioSeleccionado &&
      seleccion.profesionalId &&
      seleccion.horario
    );
  }

  useEffect(() => {
    if (step !== 3 || !servicioSeleccionado) return;

    (async () => {
      try {
        setLoadingStep(true);
        setError('');
        setProHorarios([]);

        const nombresValidos = servicioSeleccionado.profesionales || [];

        const profesionalesCompatibles = profesionalesApi.filter(
          (p) => nombresValidos.includes(p.nombreCompleto),
        );

        const resultado = [];

        for (const pro of profesionalesCompatibles) {
          try {
            const horarios = await getHorariosByProfesionalId(pro.id);
            resultado.push({
              profesional: pro,
              horarios: Array.isArray(horarios) ? horarios : [],
            });
          } catch (err) {
            console.error(
              'Error cargando horarios para profesional',
              pro.id,
              err,
            );
          }
        }

        setProHorarios(resultado);
      } catch (err) {
        console.error(err);
        setError('Error al cargar horarios. Intenta nuevamente.');
      } finally {
        setLoadingStep(false);
      }
    })();
  }, [step, servicioSeleccionado, profesionalesApi]);

  async function handleConfirmarReserva() {
    if (!canConfirm()) {
      setError('Falta seleccionar profesional y horario.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoadingStep(true);

    try {
      const pacienteBackend = await ensurePaciente({
        nombreCompleto: pacienteForm.nombreCompleto.trim(),
        email: pacienteForm.email.trim(),
        telefono: pacienteForm.telefono.trim(),
      });

      const motivo = `[Flujo paciente] [RUT: ${
        pacienteForm.rut
      }] ${servicioSeleccionado.tratamiento} - ${
        servicioSeleccionado.descripcion
      }`;

      await createReserva({
        pacienteId: Number(pacienteBackend.id),
        profesionalId: Number(seleccion.profesionalId),
        horarioDisponibleId: Number(seleccion.horario.id),
        motivo,
      });

      setSuccessMsg('¡Reserva creada correctamente!');
      setStep(4);
    } catch (err) {
      console.error(err);
      setError('Error al crear la reserva. Intenta nuevamente.');
    } finally {
      setLoadingStep(false);
    }
  }

  return (
    <div className="panel">
      <section className="panel-section">
        <div className="panel-section-header">
          <h2>Flujo paciente</h2>
          <p className="panel-section-subtitle">
            Simula el proceso de reserva para pacientes, similar a
            plataformas de clínicas.
          </p>
        </div>

        <div className="stepper">
          {['Paciente', 'Servicio', 'Profesional y horario', 'Resumen'].map(
            (label, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isDone = step > stepNumber;

              return (
                <div
                  key={label}
                  className={`stepper-item ${
                    isActive ? 'stepper-item--active' : ''
                  } ${isDone ? 'stepper-item--done' : ''}`}
                >
                  <div className="stepper-badge">{stepNumber}</div>
                  <span>{label}</span>
                </div>
              );
            },
          )}
        </div>

        {error && <p className="error-text">{error}</p>}
        {successMsg && <p className="success-text">{successMsg}</p>}

        {step === 1 && (
          <div className="card">
            <h3>1. Datos del paciente</h3>
            <p className="card-subtitle">
              Ingresa la información básica para identificar al paciente.
            </p>

            <div className="form-grid">
              <div className="form-field form-field-full">
                <label>Nombre completo</label>
                <input
                  type="text"
                  placeholder="Nombre y apellido"
                  value={pacienteForm.nombreCompleto}
                  onChange={(e) =>
                    setPacienteForm((prev) => ({
                      ...prev,
                      nombreCompleto: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-field">
                <label>RUT</label>
                <input
                  type="text"
                  placeholder="Ej: 12.345.678-9"
                  value={pacienteForm.rut}
                  onChange={(e) =>
                    setPacienteForm((prev) => ({
                      ...prev,
                      rut: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-field">
                <label>Teléfono</label>
                <input
                  type="tel"
                  placeholder="+569..."
                  value={pacienteForm.telefono}
                  onChange={(e) =>
                    setPacienteForm((prev) => ({
                      ...prev,
                      telefono: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-field form-field-full">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="nombre@correo.cl"
                  value={pacienteForm.email}
                  onChange={(e) =>
                    setPacienteForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="form-actions space-between">
              <span />
              <button
                className="btn btn-primary"
                disabled={!canGoStep2()}
                onClick={nextStep}
              >
                Continuar a selección de servicio
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h3>2. Selección de servicio</h3>
            <p className="card-subtitle">
              Elige la especialidad, modalidad y tratamiento que necesitas.
            </p>

            <div className="form-grid">
              <div className="form-field">
                <label>Especialidad</label>
                <select
                  value={especialidad}
                  onChange={(e) => {
                    setEspecialidad(e.target.value);
                    setModalidad('');
                    setServicioId('');
                  }}
                >
                  <option value="">Selecciona una especialidad</option>
                  {especialidadesDisponibles.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Modalidad</label>
                <select
                  value={modalidad}
                  onChange={(e) => {
                    setModalidad(e.target.value);
                    setServicioId('');
                  }}
                  disabled={!especialidad}
                >
                  <option value="">
                    {especialidad
                      ? 'Selecciona modalidad'
                      : 'Selecciona especialidad primero'}
                  </option>
                  {modalidadesDisponibles.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field form-field-full">
                <label>Tratamiento</label>
                <select
                  value={servicioId}
                  onChange={(e) => setServicioId(e.target.value)}
                  disabled={!modalidad}
                >
                  <option value="">
                    {modalidad
                      ? 'Selecciona tratamiento'
                      : 'Selecciona modalidad primero'}
                  </option>
                  {tratamientosDisponibles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.tratamiento}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {servicioSeleccionado && (
              <div className="service-summary">
                <h4>Detalle del tratamiento seleccionado</h4>
                <ul>
                  <li>
                    <strong>Categoría:</strong> {servicioSeleccionado.categoria}
                  </li>
                  <li>
                    <strong>Código:</strong> {servicioSeleccionado.codigo}
                  </li>
                  <li>
                    <strong>Descripción:</strong>{' '}
                    {servicioSeleccionado.descripcion}
                  </li>
                  <li>
                    <strong>Valor:</strong> {servicioSeleccionado.valor}
                  </li>
                  <li>
                    <strong>Profesionales que aplican:</strong>{' '}
                    {servicioSeleccionado.profesionales.join(', ')}
                  </li>
                </ul>
              </div>
            )}

            <div className="form-actions space-between">
              <button className="btn btn-ghost" onClick={prevStep}>
                Volver
              </button>
              <button
                className="btn btn-primary"
                disabled={!canGoStep3()}
                onClick={nextStep}
              >
                Continuar a profesional y horario
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h3>3. Profesional y horario</h3>
            <p className="card-subtitle">
              Elige el profesional y la hora que más te acomode.
            </p>

            {loadingStep && <p>Cargando horarios…</p>}

            {!loadingStep && proHorarios.length === 0 && (
              <p>
                No se encontraron profesionales con este tratamiento o
                sin horarios disponibles.
              </p>
            )}

            <div className="professionals-grid">
              {proHorarios.map(({ profesional, horarios }) => (
                <div key={profesional.id} className="professional-card">
                  <h4>{profesional.nombreCompleto}</h4>
                  <p className="professional-specialty">
                    {profesional.especialidad}
                  </p>

                  {horarios.length === 0 ? (
                    <p className="no-slots">
                      Sin horarios disponibles en este momento.
                    </p>
                  ) : (
                    <div className="slots-grid">
                      {horarios.map((h) => {
                        const isSelected =
                          seleccion.profesionalId === profesional.id &&
                          seleccion.horario?.id === h.id;
                        return (
                          <button
                            key={h.id}
                            type="button"
                            className={`slot-btn ${
                              isSelected ? 'slot-btn--selected' : ''
                            }`}
                            onClick={() =>
                              setSeleccion({
                                profesionalId: profesional.id,
                                horario: h,
                              })
                            }
                          >
                            {new Date(h.fecha).toLocaleString('es-CL', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions space-between">
              <button className="btn btn-ghost" onClick={prevStep}>
                Volver
              </button>
              <button
                className="btn btn-primary"
                disabled={!canConfirm() || loadingStep}
                onClick={handleConfirmarReserva}
              >
                {loadingStep ? 'Creando reserva…' : 'Ir a resumen'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && servicioSeleccionado && seleccion.horario && (
          <div className="card">
            <h3>4. Resumen de la atención</h3>
            <p className="card-subtitle">
              Revisa que todos los datos estén correctos.
            </p>

            <div className="summary-grid">
              <div>
                <h4>Paciente</h4>
                <ul>
                  <li>
                    <strong>Nombre:</strong> {pacienteForm.nombreCompleto}
                  </li>
                  <li>
                    <strong>RUT:</strong> {pacienteForm.rut}
                  </li>
                  <li>
                    <strong>Teléfono:</strong> {pacienteForm.telefono}
                  </li>
                  <li>
                    <strong>Email:</strong> {pacienteForm.email}
                  </li>
                </ul>
              </div>

              <div>
                <h4>Prestación</h4>
                <ul>
                  <li>
                    <strong>Especialidad:</strong>{' '}
                    {servicioSeleccionado.especialidad}
                  </li>
                  <li>
                    <strong>Categoría:</strong>{' '}
                    {servicioSeleccionado.categoria}
                  </li>
                  <li>
                    <strong>Tratamiento:</strong>{' '}
                    {servicioSeleccionado.tratamiento}
                  </li>
                  <li>
                    <strong>Código:</strong> {servicioSeleccionado.codigo}
                  </li>
                  <li>
                    <strong>Valor:</strong> {servicioSeleccionado.valor}
                  </li>
                </ul>
              </div>

              <div>
                <h4>Profesional y horario</h4>
                <ul>
                  <li>
                    <strong>Profesional:</strong>{' '}
                    {profesionalesApi.find(
                      (p) => p.id === seleccion.profesionalId,
                    )?.nombreCompleto || '-'}
                  </li>
                  <li>
                    <strong>Fecha y hora:</strong>{' '}
                    {new Date(
                      seleccion.horario.fecha,
                    ).toLocaleString('es-CL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </li>
                </ul>
              </div>
            </div>

            <div className="form-actions space-between">
              <button className="btn btn-ghost" onClick={() => setStep(3)}>
                Volver a horarios
              </button>
              <button
                className="btn btn-primary"
                onClick={() =>
                  setSuccessMsg(
                    'Reserva ya fue creada en el paso anterior. Este resumen es sólo informativo.',
                  )
                }
              >
                Finalizar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
