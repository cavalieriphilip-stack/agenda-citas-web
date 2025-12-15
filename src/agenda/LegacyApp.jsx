// src/LegacyApp.jsx
import { useEffect, useMemo, useState, Fragment } from "react";
import "./App.css";
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
  crearProfesional,
  crearHorario,
  crearHorariosLote,
  eliminarHorario,
} from "./api";

const PASOS_FLUJO = [
  "Datos personales",
  "Especialidad y modalidad",
  "Selección de día, profesional y horario",
  "Resumen y confirmación",
];

// ----------------------- UTILIDADES -----------------------

function limpiarRut(value) {
  return (value || "").replace(/[^0-9kK]/g, "").toUpperCase();
}

function formatearRut(value) {
  const clean = limpiarRut(value);
  if (!clean) return "";
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!cuerpo) return dv;

  const reversed = cuerpo.split("").reverse();
  const conPuntos = [];
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) conPuntos.push(".");
    conPuntos.push(reversed[i]);
  }
  const cuerpoFormateado = conPuntos.reverse().join("");
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
  if (dvEsperado === 11) dvCalc = "0";
  else if (dvEsperado === 10) dvCalc = "K";
  else dvCalc = String(dvEsperado);
  return dvCalc === dv.toUpperCase();
}

function formatearTelefono(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 9);
  if (!digits) return "";
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits[0]} ${digits.slice(1)}`;
  return `${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`;
}

function esTelefonoChilenoValido(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 9 && digits.startsWith("9");
}

function esEmailValido(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDay(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { weekday: "short" }).toUpperCase();
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return d.getDate().toString().padStart(2, "0");
}

function toDateKey(iso) {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ----------------------- DATOS TRATAMIENTOS (RESUMEN) -----------------------

const TRATAMIENTOS = [
  {
    id: "FON-INF-EVAL-ONLINE",
    especialidad: "Fonoaudiología Infanto-Juvenil",
    categoria: "Fonoaudiología Infanto-Juvenil",
    tratamiento: "Evaluación fonoaudiológica infanto-juvenil online",
    codigoFonasa: "13-02-2003",
    descripcion: "Evaluación de voz, habla y lenguaje",
    valor: 35000,
    profesionalesIds: [1, 2],
  },
  {
    id: "FON-ADULTO-EVAL-ONLINE",
    especialidad: "Fonoaudiología Adulto",
    categoria: "Fonoaudiología Adulto",
    tratamiento: "Evaluación fonoaudiológica adulto online",
    codigoFonasa: "13-02-2003",
    descripcion: "Evaluación de voz, habla y lenguaje",
    valor: 35000,
    profesionalesIds: [1],
  },
  {
    id: "PSI-ADULTO-ONLINE",
    especialidad: "Psicología Adulto",
    categoria: "Psicología Adulto",
    tratamiento: "Evaluación Psicología Adulto online",
    codigoFonasa: "09-02-2001",
    descripcion: "Psicodiagnóstico",
    valor: 30000,
    profesionalesIds: [3, 4],
  },
  {
    id: "PSI-INFANTO-ONLINE",
    especialidad: "Psicología Infanto-Juvenil",
    categoria: "Psicología Infanto-Juvenil",
    tratamiento: "Evaluación Psicología Infanto-Juvenil online",
    codigoFonasa: "09-02-2001",
    descripcion: "Psicodiagnóstico",
    valor: 30000,
    profesionalesIds: [3, 4, 5],
  },
  {
    id: "PACK-PSI-BIENESTAR",
    especialidad: "Pack Psicologia",
    categoria: "Pack Psicologia",
    tratamiento: "Pack Bienestar Emocional (4 sesiones Psicologia online)",
    codigoFonasa: "PACK-PSI",
    descripcion: "Tratamiento Psicología Mensual (4 sesiones)",
    valor: 90000,
    profesionalesIds: [3, 4, 5],
  },
  {
    id: "MAT-ADULTO-ONLINE",
    especialidad: "Matrona Adulto Teleconsulta",
    categoria: "Matrona",
    tratamiento: "Consulta Matrona adulto online",
    codigoFonasa: "11-01-1942",
    descripcion: "Consulta matrona",
    valor: 18000,
    profesionalesIds: [6],
  },
];

// ----------------------- COMPONENTE PRINCIPAL -----------------------

export default function LegacyApp({ mode = "legacy" }) {
  // legacy: tabs disponibles
  // paciente: SOLO wizard
  // centro: SOLO panel con menú vertical
  const [activeTab, setActiveTab] = useState("panel"); // legacy only
  const view =
    mode === "legacy" ? activeTab : mode === "centro" ? "panel" : "flujo";

  // Menú vertical (centro)
  const [agendaSection, setAgendaSection] = useState("reservas"); // profesionales|horarios|pacientes|reservas
  const [topMenu, setTopMenu] = useState("agenda"); // agenda|finanzas

  const [pacientes, setPacientes] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loadingInicial, setLoadingInicial] = useState(true);

  // Cache horarios por profesional (enriquecidos: reservado true/false)
  const [horariosPorProfesional, setHorariosPorProfesional] = useState({});
  const [flowHorariosPorProfesional, setFlowHorariosPorProfesional] = useState(
    {}
  );

  // ------------------ PANEL RESERVAS ------------------
  const [panelForm, setPanelForm] = useState({
    pacienteId: "",
    profesionalId: "",
    horarioId: "",
    motivo: "",
  });
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const [panelError, setPanelError] = useState("");
  const [panelSuccess, setPanelSuccess] = useState("");
  const [cancelandoId, setCancelandoId] = useState(null);

  // Reagendar
  const [reagendandoId, setReagendandoId] = useState(null);
  const [reagendarHorarioId, setReagendarHorarioId] = useState("");
  const [reagendarError, setReagendarError] = useState("");
  const [reagendarLoading, setReagendarLoading] = useState(false);

  // ------------------ CENTRO: PROFESIONALES ------------------
  const [proForm, setProForm] = useState({
    nombreCompleto: "",
    especialidad: "",
  });
  const [proSubmitting, setProSubmitting] = useState(false);
  const [proError, setProError] = useState("");
  const [proSuccess, setProSuccess] = useState("");

  // ------------------ CENTRO: PACIENTES ------------------
  const [pacForm, setPacForm] = useState({
    nombreCompleto: "",
    email: "",
    telefono: "",
  });
  const [pacSubmitting, setPacSubmitting] = useState(false);
  const [pacError, setPacError] = useState("");
  const [pacSuccess, setPacSuccess] = useState("");

  // ------------------ CENTRO: HORARIOS ------------------
  const [horProId, setHorProId] = useState("");
  const [horFecha, setHorFecha] = useState(""); // yyyy-mm-dd
  const [horHora, setHorHora] = useState(""); // HH:mm
  const [horSubmitting, setHorSubmitting] = useState(false);
  const [horError, setHorError] = useState("");
  const [horSuccess, setHorSuccess] = useState("");

  // Lote
  const [loteDesde, setLoteDesde] = useState(""); // yyyy-mm-dd
  const [loteHasta, setLoteHasta] = useState(""); // yyyy-mm-dd
  const [loteHoras, setLoteHoras] = useState("10:00, 10:30, 11:00");
  const [loteSubmitting, setLoteSubmitting] = useState(false);
  const [loteError, setLoteError] = useState("");
  const [loteSuccess, setLoteSuccess] = useState("");

  // ------------------ FLUJO PACIENTE ------------------
  const [flowStep, setFlowStep] = useState(0);
  const [flowData, setFlowData] = useState({
    nombreCompleto: "",
    rut: "",
    telefono: "",
    email: "",
    especialidad: "",
    tratamientoId: "",
    tratamientoLabel: "",
    codigoFonasa: "",
    valor: 0,
    profesionalesIds: [],
    profesionalId: "",
    horarioId: "",
    fechaSeleccionadaKey: "",
  });
  const [flowError, setFlowError] = useState("");
  const [flowSuccess, setFlowSuccess] = useState("");
  const [flowSubmitting, setFlowSubmitting] = useState(false);

  // ------------------ CARGA INICIAL ------------------
  useEffect(() => {
    cargarInicial().catch(console.error);
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
      console.error("Error cargando datos iniciales", err);
    } finally {
      setLoadingInicial(false);
    }
  }

  async function refrescarReservas() {
    try {
      const resvs = await getReservasDetalle();
      setReservas(resvs);
    } catch (err) {
      console.error("Error refrescando reservas", err);
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

  async function recargarHorariosProfesional(profesionalId) {
    if (!profesionalId) return [];
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

  // ------------------ PANEL RESERVAS: handlers ------------------

  function handlePanelChange(field, value) {
    setPanelForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "profesionalId" ? { horarioId: "" } : null),
    }));
    if (field === "profesionalId" && value) {
      cargarHorariosProfesional(parseInt(value, 10)).catch(console.error);
    }
  }

  async function handleCrearReservaPanel(e) {
    e.preventDefault();
    setPanelError("");
    setPanelSuccess("");

    const { pacienteId, profesionalId, horarioId, motivo } = panelForm;

    if (!pacienteId || !profesionalId || !horarioId || !motivo.trim()) {
      setPanelError("Completa paciente, profesional, horario y motivo.");
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
        pacienteId: "",
        profesionalId: "",
        horarioId: "",
        motivo: "",
      });
      setPanelSuccess("Reserva creada correctamente.");
      await refrescarReservas();
      await recargarHorariosProfesional(parseInt(profesionalId, 10));
    } catch (err) {
      setPanelError(err.message || "Error al crear la reserva.");
    } finally {
      setPanelSubmitting(false);
    }
  }

  async function handleCancelarReserva(id) {
    if (!window.confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    try {
      setCancelandoId(id);
      await cancelarReserva(id);
      await refrescarReservas();
      // refresco “optimista” de horarios (para que reservado cambie)
      if (panelForm.profesionalId) {
        await recargarHorariosProfesional(parseInt(panelForm.profesionalId, 10));
      }
    } catch (err) {
      alert(err.message || "Error al cancelar la reserva.");
    } finally {
      setCancelandoId(null);
    }
  }

  async function handleAbrirReagendar(reserva) {
    setReagendarError("");
    setReagendandoId(reserva.id);
    setReagendarHorarioId(reserva.horarioDisponibleId?.toString() || "");
    try {
      await cargarHorariosProfesional(reserva.profesionalId);
    } catch (err) {
      setReagendarError("No se pudieron cargar los horarios del profesional.");
    }
  }

  function handleCerrarReagendar() {
    setReagendandoId(null);
    setReagendarHorarioId("");
    setReagendarError("");
  }

  async function handleConfirmarReagendar(reserva) {
    setReagendarError("");
    if (!reagendarHorarioId) {
      setReagendarError("Selecciona un nuevo horario para reagendar.");
      return;
    }

    try {
      setReagendarLoading(true);
      await reagendarReserva(reserva.id, parseInt(reagendarHorarioId, 10));
      await refrescarReservas();
      await recargarHorariosProfesional(reserva.profesionalId);
      handleCerrarReagendar();
    } catch (err) {
      setReagendarError(err.message || "Error al reagendar la reserva.");
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

  // ------------------ CENTRO: PROFESIONALES handlers ------------------

  async function handleCrearProfesional(e) {
    e.preventDefault();
    setProError("");
    setProSuccess("");

    if (!proForm.nombreCompleto.trim() || !proForm.especialidad.trim()) {
      setProError("Completa nombre completo y especialidad.");
      return;
    }

    try {
      setProSubmitting(true);
      await crearProfesional({
        nombreCompleto: proForm.nombreCompleto.trim(),
        especialidad: proForm.especialidad.trim(),
      });
      setProForm({ nombreCompleto: "", especialidad: "" });
      setProSuccess("Profesional creado correctamente.");
      const pros = await getProfesionales();
      setProfesionales(pros);
    } catch (err) {
      setProError(err.message || "Error al crear profesional.");
    } finally {
      setProSubmitting(false);
    }
  }

  // ------------------ CENTRO: PACIENTES handlers ------------------

  async function handleCrearPacienteCentro(e) {
    e.preventDefault();
    setPacError("");
    setPacSuccess("");

    if (!pacForm.nombreCompleto.trim()) {
      setPacError("Ingresa nombre completo.");
      return;
    }
    if (!esEmailValido(pacForm.email)) {
      setPacError("Ingresa un correo válido.");
      return;
    }
    if (!esTelefonoChilenoValido(pacForm.telefono)) {
      setPacError("Ingresa un teléfono chileno válido (9 dígitos).");
      return;
    }

    try {
      setPacSubmitting(true);
      await crearPaciente({
        nombreCompleto: pacForm.nombreCompleto.trim(),
        email: pacForm.email.trim(),
        telefono: pacForm.telefono.replace(/\D/g, ""),
      });
      setPacForm({ nombreCompleto: "", email: "", telefono: "" });
      setPacSuccess("Paciente creado correctamente.");
      const pacs = await getPacientes();
      setPacientes(pacs);
    } catch (err) {
      setPacError(err.message || "Error al crear paciente.");
    } finally {
      setPacSubmitting(false);
    }
  }

  // ------------------ CENTRO: HORARIOS handlers ------------------

  async function handleCrearHorario(e) {
    e.preventDefault();
    setHorError("");
    setHorSuccess("");

    const proId = parseInt(horProId, 10);
    if (!proId) {
      setHorError("Selecciona un profesional.");
      return;
    }
    if (!horFecha || !horHora) {
      setHorError("Selecciona fecha y hora.");
      return;
    }

    // Date local -> ISO
    const d = new Date(`${horFecha}T${horHora}:00`);
    if (Number.isNaN(d.getTime())) {
      setHorError("Fecha/hora inválida.");
      return;
    }

    try {
      setHorSubmitting(true);
      await crearHorario({ profesionalId: proId, fechaHoraIso: d.toISOString() });
      setHorSuccess("Horario creado.");
      await recargarHorariosProfesional(proId);
      setHorFecha("");
      setHorHora("");
    } catch (err) {
      setHorError(err.message || "Error al crear horario.");
    } finally {
      setHorSubmitting(false);
    }
  }

  function buildFechasLote({ desde, hasta, horasCsv }) {
    const horas = (horasCsv || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const validHoras = horas.filter((h) => /^\d{2}:\d{2}$/.test(h));
    if (validHoras.length === 0) return [];

    const start = new Date(`${desde}T00:00:00`);
    const end = new Date(`${hasta}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (end < start) return [];

    const fechasIso = [];
    const cur = new Date(start);
    while (cur <= end) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, "0");
      const dd = String(cur.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      for (const hhmm of validHoras) {
        const d = new Date(`${dateStr}T${hhmm}:00`);
        if (!Number.isNaN(d.getTime())) fechasIso.push(d.toISOString());
      }
      cur.setDate(cur.getDate() + 1);
    }
    return fechasIso;
  }

  async function handleCrearHorariosLote(e) {
    e.preventDefault();
    setLoteError("");
    setLoteSuccess("");

    const proId = parseInt(horProId, 10);
    if (!proId) {
      setLoteError("Selecciona un profesional.");
      return;
    }
    if (!loteDesde || !loteHasta) {
      setLoteError("Selecciona fecha desde y hasta.");
      return;
    }

    const fechasIso = buildFechasLote({
      desde: loteDesde,
      hasta: loteHasta,
      horasCsv: loteHoras,
    });

    if (fechasIso.length === 0) {
      setLoteError("No se pudieron generar fechas. Revisa rango y formato horas (HH:mm).");
      return;
    }

    try {
      setLoteSubmitting(true);
      const result = await crearHorariosLote({ profesionalId: proId, fechasIso });
      setLoteSuccess(`Horarios creados: ${result.createdCount}`);
      await recargarHorariosProfesional(proId);
    } catch (err) {
      setLoteError(err.message || "Error al crear horarios en lote.");
    } finally {
      setLoteSubmitting(false);
    }
  }

  async function handleEliminarHorario(horario) {
    if (horario.reservado) {
      alert("Este horario está reservado y no se puede eliminar.");
      return;
    }
    if (!window.confirm("¿Eliminar este horario?")) return;

    try {
      await eliminarHorario(horario.id);
      const proId = parseInt(horProId, 10);
      if (proId) await recargarHorariosProfesional(proId);
    } catch (err) {
      alert(err.message || "Error al eliminar horario.");
    }
  }

  // ------------------ FLUJO PACIENTE: DERIVADOS ------------------

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
        // solo no reservados para el paciente
        if (h.reservado) return;
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
        (h) =>
          !h.reservado && toDateKey(h.fecha) === flowData.fechaSeleccionadaKey
      );
      if (horarios.length) result[proId] = horarios;
    });
    return result;
  }, [flowData.fechaSeleccionadaKey, flowHorariosPorProfesional, flowData.profesionalesIds]);

  // ------------------ FLUJO PACIENTE: handlers ------------------

  function updateFlow(field, value) {
    setFlowData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleNextFromStep1() {
    setFlowError("");
    const { nombreCompleto, rut, telefono, email } = flowData;

    if (!nombreCompleto.trim()) {
      setFlowError("Ingresa tu nombre completo.");
      return;
    }
    if (!esRutValido(rut)) {
      setFlowError("Ingresa un RUT chileno válido.");
      return;
    }
    if (!esTelefonoChilenoValido(telefono)) {
      setFlowError("Ingresa un teléfono chileno válido (9 dígitos).");
      return;
    }
    if (!esEmailValido(email)) {
      setFlowError("Ingresa un correo electrónico válido.");
      return;
    }

    setFlowStep(1);
  }

  function handleNextFromStep2() {
    setFlowError("");
    if (!flowData.especialidad || !flowData.tratamientoId) {
      setFlowError("Selecciona especialidad y modalidad de atención.");
      return;
    }
    setFlowStep(2);
  }

  async function handleEnterStep3() {
    setFlowError("");
    const tratamiento = TRATAMIENTOS.find((t) => t.id === flowData.tratamientoId);
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
        if (h.reservado) return;
        const key = toDateKey(h.fecha);
        if (!dias.includes(key)) dias.push(key);
      });
    });

    const fechaSeleccionadaKey = dias.sort()[0] || "";
    setFlowData((prev) => ({
      ...prev,
      profesionalesIds: tratamiento.profesionalesIds,
      fechaSeleccionadaKey,
      profesionalId: "",
      horarioId: "",
    }));
  }

  function handleSelectDia(key) {
    setFlowData((prev) => ({
      ...prev,
      fechaSeleccionadaKey: key,
      profesionalId: "",
      horarioId: "",
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
    setFlowError("");
    if (!flowData.profesionalId || !flowData.horarioId) {
      setFlowError("Selecciona un profesional y un horario disponible.");
      return;
    }
    setFlowStep(3);
  }

  async function handleConfirmarAgendamiento() {
    setFlowError("");
    setFlowSuccess("");

    if (!flowData.profesionalId || !flowData.horarioId) {
      setFlowError("Falta seleccionar profesional y horario.");
      return;
    }

    try {
      setFlowSubmitting(true);

      const paciente = await crearPaciente({
        nombreCompleto: flowData.nombreCompleto.trim(),
        email: flowData.email.trim(),
        telefono: flowData.telefono.replace(/\D/g, ""),
      });

      const motivo = `[Flujo paciente] [${flowData.tratamientoLabel}] ${flowData.rut} - ${flowData.nombreCompleto}`;

      await crearReserva({
        pacienteId: paciente.id,
        profesionalId: flowData.profesionalId,
        horarioDisponibleId: flowData.horarioId,
        motivo,
      });

      await cargarInicial();
      // refresco horario del profesional elegido (para marcar reservado)
      await recargarHorariosProfesional(flowData.profesionalId);

      setFlowSuccess("Tu hora fue agendada correctamente.");
      setFlowStep(0);
      setFlowData({
        nombreCompleto: "",
        rut: "",
        telefono: "",
        email: "",
        especialidad: "",
        tratamientoId: "",
        tratamientoLabel: "",
        codigoFonasa: "",
        valor: 0,
        profesionalesIds: [],
        profesionalId: "",
        horarioId: "",
        fechaSeleccionadaKey: "",
      });
    } catch (err) {
      setFlowError(err.message || "Error al confirmar la reserva.");
    } finally {
      setFlowSubmitting(false);
    }
  }

  // ------------------ RENDERS: piezas ------------------

  function Header() {
    const subtitle =
      mode === "paciente"
        ? "Agenda tu hora en pocos pasos."
        : "Panel interno de reservas para tu equipo clínico.";

    return (
      <header className="app-header">
        <div className="app-header-left">
          <div className="logo-circle">C</div>
          <div>
            <div className="app-kicker">CISD · CENTRO INTEGRAL DE SALUD DREYSE</div>
            <h1 className="app-title">Agenda CISD</h1>
            <p className="app-subtitle">{subtitle}</p>
          </div>
        </div>

        <div
          className="api-pill"
          style={{ display: mode === "paciente" ? "none" : undefined }}
        >
          API:{" "}
          <a href={API_BASE_URL} target="_blank" rel="noreferrer">
            {API_BASE_URL}
          </a>
        </div>
      </header>
    );
  }

  function LegacyTabs() {
    if (mode !== "legacy") return null;
    return (
      <div className="tabs">
        <button
          type="button"
          className={activeTab === "panel" ? "tab-btn tab-btn--active" : "tab-btn"}
          onClick={() => setActiveTab("panel")}
        >
          Panel interno
        </button>
        <button
          type="button"
          className={activeTab === "flujo" ? "tab-btn tab-btn--active" : "tab-btn"}
          onClick={() => setActiveTab("flujo")}
        >
          Flujo paciente
        </button>
      </div>
    );
  }

  function PanelReservas() {
    return (
      <section className="panel-card">
        {/* CREAR RESERVA */}
        <div className="panel-section">
          <div className="panel-section-header">
            <h2>Crear nueva reserva</h2>
            <p>Selecciona paciente, profesional y uno de sus horarios disponibles.</p>
          </div>

          {panelError && <div className="alert alert--error">{panelError}</div>}
          {panelSuccess && <div className="alert">{panelSuccess}</div>}

          <form className="reserva-form" onSubmit={handleCrearReservaPanel}>
            <div className="form-grid">
              <div className="form-field">
                <label>Paciente</label>
                <select
                  value={panelForm.pacienteId}
                  onChange={(e) => handlePanelChange("pacienteId", e.target.value)}
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
                  onChange={(e) => handlePanelChange("profesionalId", e.target.value)}
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
                  onChange={(e) => handlePanelChange("horarioId", e.target.value)}
                  disabled={!panelForm.profesionalId}
                >
                  <option value="">
                    {panelForm.profesionalId
                      ? "Selecciona un horario disponible"
                      : "Selecciona primero un profesional"}
                  </option>
                  {(
                    horariosPorProfesional[
                      panelForm.profesionalId ? parseInt(panelForm.profesionalId, 10) : -1
                    ] || []
                  ).map((h) => (
                    <option key={h.id} value={h.id} disabled={h.reservado}>
                      {formatDateTime(h.fecha)} {h.reservado ? "(reservado)" : ""}
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
                  onChange={(e) => handlePanelChange("motivo", e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <button type="submit" className="primary-btn" disabled={panelSubmitting}>
                {panelSubmitting ? "Creando reserva…" : "Crear reserva"}
              </button>
            </div>
          </form>
        </div>

        {/* LISTADO RESERVAS */}
        <div className="panel-section" style={{ marginTop: 16 }}>
          <div className="panel-section-header">
            <h2>Reservas registradas</h2>
            <p>Revisa y administra las reservas agendadas. Incluye datos de contacto.</p>
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
                          {r.pacienteTelefono && <div>{r.pacienteTelefono}</div>}
                          {r.pacienteEmail && <div>{r.pacienteEmail}</div>}
                          {!r.pacienteTelefono && !r.pacienteEmail && "—"}
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
                            {cancelandoId === r.id ? "Cancelando…" : "Cancelar"}
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
                                border: "1px solid var(--border-soft)",
                                backgroundColor: "#fafafa",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              <strong>Reagendar reserva #{r.id}</strong>
                              <div className="form-grid">
                                <div className="form-field">
                                  <label>Nuevo horario</label>
                                  <select
                                    value={reagendarHorarioId}
                                    onChange={(e) => setReagendarHorarioId(e.target.value)}
                                  >
                                    <option value="">Selecciona un nuevo horario</option>
                                    {horariosProfesionalReagendar
                                      .filter((h) => !h.reservado || h.id === r.horarioDisponibleId)
                                      .map((h) => (
                                        <option key={h.id} value={h.id}>
                                          {formatDateTime(h.fecha)} {h.reservado ? "(reservado)" : ""}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                              {reagendarError && (
                                <div className="alert alert--error">{reagendarError}</div>
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
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
                                  onClick={() => handleConfirmarReagendar(r)}
                                  disabled={reagendarLoading}
                                >
                                  {reagendarLoading ? "Guardando…" : "Guardar cambios"}
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
    );
  }

  function FlujoPaciente() {
    return (
      <section className="panel-card">
        <div className="panel-section">
          <div className="panel-section-header">
            <h2>Agenda tu hora</h2>
            <p>
              Completa tus datos, elige especialidad y modalidad y luego selecciona
              día, profesional y horario.
            </p>
          </div>

          {/* TIMELINE */}
          <div className="steps-timeline">
            <div className="steps-line-base">
              <div
                className="steps-line-fill"
                style={{
                  width: `${(flowStep / (PASOS_FLUJO.length - 1)) * 100}%`,
                }}
              />
            </div>
            <div className="steps-nodes">
              {PASOS_FLUJO.map((_, idx) => {
                const status =
                  idx === flowStep ? "active" : idx < flowStep ? "done" : "";
                return (
                  <div
                    key={idx}
                    className={`steps-node${status ? ` steps-node--${status}` : ""}`}
                  >
                    {idx + 1}
                  </div>
                );
              })}
            </div>
            <div className="steps-labels">
              {PASOS_FLUJO.map((label, idx) => {
                const status =
                  idx === flowStep ? "active" : idx < flowStep ? "done" : "";
                return (
                  <div
                    key={label}
                    className={`steps-label${status ? ` steps-label--${status}` : ""}`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {flowError && <div className="alert alert--error">{flowError}</div>}
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
                    onChange={(e) => updateFlow("nombreCompleto", e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>RUT</label>
                  <input
                    type="text"
                    placeholder="12.345.678-9"
                    value={flowData.rut}
                    onChange={(e) => updateFlow("rut", formatearRut(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    placeholder="9 1234 5678"
                    value={flowData.telefono}
                    onChange={(e) => updateFlow("telefono", formatearTelefono(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="correo@dominio.cl"
                    value={flowData.email}
                    onChange={(e) => updateFlow("email", e.target.value)}
                  />
                </div>
              </div>
              <div className="step-actions">
                <button type="button" className="primary-btn" onClick={handleNextFromStep1}>
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
                    onChange={(e) => updateFlow("especialidad", e.target.value)}
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
                      updateFlow("tratamientoId", id);
                      if (trat) {
                        setFlowData((prev) => ({
                          ...prev,
                          tratamientoLabel: trat.tratamiento,
                          codigoFonasa: trat.codigoFonasa,
                          valor: trat.valor,
                          profesionalesIds: trat.profesionalesIds,
                          profesionalId: "",
                          horarioId: "",
                          fechaSeleccionadaKey: "",
                        }));
                      }
                    }}
                  >
                    <option value="">Selecciona modalidad de atención</option>
                    {tratamientosFiltrados.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tratamiento}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="step-actions">
                <button type="button" className="ghost-btn" onClick={() => setFlowStep(0)}>
                  Volver
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={async () => {
                    const before = flowError;
                    handleNextFromStep2();
                    if (!before) {
                      await handleEnterStep3();
                    }
                  }}
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
                  <span className="summary-value">{flowData.especialidad || "—"}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Tratamiento:</span>
                  <span className="summary-value">{flowData.tratamientoLabel || "—"}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Modalidad / valor:</span>
                  <span className="summary-value">
                    {flowData.valor
                      ? `Online · $${flowData.valor.toLocaleString("es-CL")}`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="step-3-layout" style={{ marginTop: 12 }}>
                <div>
                  <div className="dia-selector-title">Selecciona día</div>
                  <div className="day-strip">
                    {diasDisponiblesFlujo.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        className={`day-chip${
                          flowData.fechaSeleccionadaKey === d.key ? " day-chip--active" : ""
                        }`}
                        onClick={() => handleSelectDia(d.key)}
                      >
                        <span className="day-chip-weekday">{formatShortDay(d.isoEjemplo)}</span>
                        <span className="day-chip-date">{formatShortDate(d.isoEjemplo)}</span>
                      </button>
                    ))}
                    {diasDisponiblesFlujo.length === 0 && (
                      <span style={{ fontSize: "0.8rem" }}>
                        No hay horarios disponibles para esta prestación.
                      </span>
                    )}
                  </div>
                </div>

                <div className="profesionales-block">
                  <div className="profesionales-title">Profesionales y horarios</div>
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
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="pro-info-main">{prof.nombreCompleto}</div>
                              <div className="pro-info-sub">{prof.especialidad}</div>
                            </div>
                          </div>

                          <div className="pro-times">
                            {hs.length === 0 ? (
                              <span style={{ fontSize: "0.75rem" }}>
                                Sin horarios en este día.
                              </span>
                            ) : (
                              hs.map((h) => (
                                <button
                                  key={h.id}
                                  type="button"
                                  className={`pro-time-chip${
                                    flowData.horarioId === h.id && flowData.profesionalId === proId
                                      ? " pro-time-chip--active"
                                      : ""
                                  }`}
                                  onClick={() => handleSelectHorario(proId, h.id)}
                                >
                                  {new Date(h.fecha).toLocaleTimeString("es-CL", {
                                    hour: "2-digit",
                                    minute: "2-digit",
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
                <button type="button" className="ghost-btn" onClick={() => setFlowStep(1)}>
                  Volver
                </button>
                <button type="button" className="primary-btn" onClick={handleNextFromStep3}>
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
                  <div className="summary-title">Datos personales</div>
                  <div className="summary-row">
                    <span className="summary-label">Nombre:</span>
                    <span className="summary-value">{flowData.nombreCompleto || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">RUT:</span>
                    <span className="summary-value">{flowData.rut || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Teléfono:</span>
                    <span className="summary-value">{flowData.telefono || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Correo:</span>
                    <span className="summary-value">{flowData.email || "—"}</span>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-title">Detalle de la cita</div>
                  <div className="summary-row">
                    <span className="summary-label">Especialidad:</span>
                    <span className="summary-value">{flowData.especialidad || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Tratamiento:</span>
                    <span className="summary-value">{flowData.tratamientoLabel || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Código Fonasa:</span>
                    <span className="summary-value">{flowData.codigoFonasa || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Profesional:</span>
                    <span className="summary-value">
                      {(() => {
                        const p = profesionales.find((x) => x.id === flowData.profesionalId);
                        return p?.nombreCompleto || "—";
                      })()}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Fecha / hora:</span>
                    <span className="summary-value">
                      {(() => {
                        const proId = flowData.profesionalId;
                        const horarios = flowHorariosPorProfesional[proId] || [];
                        const h = horarios.find((x) => x.id === flowData.horarioId);
                        return h ? formatDateTime(h.fecha) : "—";
                      })()}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Valor:</span>
                    <span className="summary-value">
                      {flowData.valor ? `$${flowData.valor.toLocaleString("es-CL")}` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="muted-text">
                En el siguiente paso podrás integrar una pasarela de pago para confirmar tu
                reserva automáticamente.
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
                  {flowSubmitting ? "Confirmando…" : "Confirmar agendamiento"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  function CentroAgendaLayout() {
    // Top menu (Agenda/Finanzas) + vertical menu en Agenda
    const isAgenda = topMenu === "agenda";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Menú superior */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "white",
            border: "1px solid var(--border-soft)",
            borderRadius: 14,
            padding: 8,
          }}
        >
          <button
            type="button"
            className={topMenu === "agenda" ? "tab-btn tab-btn--active" : "tab-btn"}
            onClick={() => setTopMenu("agenda")}
          >
            Agenda
          </button>
          <button
            type="button"
            className={topMenu === "finanzas" ? "tab-btn tab-btn--active" : "tab-btn"}
            onClick={() => setTopMenu("finanzas")}
          >
            Finanzas
          </button>

          <div style={{ marginLeft: "auto", fontSize: "0.85rem", opacity: 0.8 }}>
            Modo centro médico
          </div>
        </div>

        {/* Contenido */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isAgenda ? "260px 1fr" : "1fr",
            gap: 12,
            alignItems: "start",
          }}
        >
          {isAgenda && (
            <aside
              style={{
                background: "white",
                border: "1px solid var(--border-soft)",
                borderRadius: 14,
                padding: 10,
                position: "sticky",
                top: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Agenda</div>

              {[
                ["profesionales", "Profesionales"],
                ["horarios", "Horarios"],
                ["pacientes", "Pacientes"],
                ["reservas", "Reservas"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={agendaSection === key ? "tab-btn tab-btn--active" : "tab-btn"}
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    marginBottom: 6,
                  }}
                  onClick={() => setAgendaSection(key)}
                >
                  {label}
                </button>
              ))}
            </aside>
          )}

          <section className="panel-card" style={{ width: "100%" }}>
            {!isAgenda ? (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h2>Finanzas</h2>
                  <p>Este módulo queda preparado para el siguiente sprint.</p>
                </div>
                <div className="alert">
                  Aquí podremos agregar: ingresos por especialidad, sesiones realizadas, pagos,
                  reportes y exportación.
                </div>
              </div>
            ) : agendaSection === "profesionales" ? (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h2>Profesionales</h2>
                  <p>Creación y resumen de profesionales.</p>
                </div>

                {proError && <div className="alert alert--error">{proError}</div>}
                {proSuccess && <div className="alert">{proSuccess}</div>}

                <form className="reserva-form" onSubmit={handleCrearProfesional}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Nombre completo</label>
                      <input
                        type="text"
                        value={proForm.nombreCompleto}
                        onChange={(e) => setProForm((p) => ({ ...p, nombreCompleto: e.target.value }))}
                        placeholder="Ej: Camila Pérez"
                      />
                    </div>
                    <div className="form-field">
                      <label>Especialidad</label>
                      <input
                        type="text"
                        value={proForm.especialidad}
                        onChange={(e) => setProForm((p) => ({ ...p, especialidad: e.target.value }))}
                        placeholder="Ej: Psicología Adulto"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <button className="primary-btn" type="submit" disabled={proSubmitting}>
                      {proSubmitting ? "Creando…" : "Crear profesional"}
                    </button>
                  </div>
                </form>

                <div style={{ height: 12 }} />

                <div className="table-wrapper">
                  <table className="reservas-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Especialidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profesionales.length === 0 ? (
                        <tr>
                          <td colSpan={3}>No hay profesionales.</td>
                        </tr>
                      ) : (
                        profesionales.map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{p.nombreCompleto}</td>
                            <td>{p.especialidad}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : agendaSection === "horarios" ? (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h2>Horarios</h2>
                  <p>Crear horarios por profesional, ver reservado true/false y eliminar si aplica.</p>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>Profesional</label>
                    <select
                      value={horProId}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setHorProId(v);
                        setHorError("");
                        setHorSuccess("");
                        setLoteError("");
                        setLoteSuccess("");
                        if (v) {
                          await recargarHorariosProfesional(parseInt(v, 10));
                        }
                      }}
                    >
                      <option value="">Selecciona un profesional</option>
                      {profesionales.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombreCompleto} · {p.especialidad}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ height: 10 }} />

                {/* Crear uno */}
                {horError && <div className="alert alert--error">{horError}</div>}
                {horSuccess && <div className="alert">{horSuccess}</div>}

                <form className="reserva-form" onSubmit={handleCrearHorario}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Fecha</label>
                      <input type="date" value={horFecha} onChange={(e) => setHorFecha(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Hora</label>
                      <input type="time" value={horHora} onChange={(e) => setHorHora(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button className="primary-btn" type="submit" disabled={horSubmitting}>
                      {horSubmitting ? "Creando…" : "Crear horario"}
                    </button>
                  </div>
                </form>

                <div style={{ height: 16 }} />

                {/* Crear en lote */}
                {loteError && <div className="alert alert--error">{loteError}</div>}
                {loteSuccess && <div className="alert">{loteSuccess}</div>}

                <form className="reserva-form" onSubmit={handleCrearHorariosLote}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Desde</label>
                      <input type="date" value={loteDesde} onChange={(e) => setLoteDesde(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Hasta</label>
                      <input type="date" value={loteHasta} onChange={(e) => setLoteHasta(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Horas (HH:mm separadas por coma)</label>
                      <input
                        type="text"
                        value={loteHoras}
                        onChange={(e) => setLoteHoras(e.target.value)}
                        placeholder="10:00, 10:30, 11:00"
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button className="primary-btn" type="submit" disabled={loteSubmitting}>
                      {loteSubmitting ? "Creando…" : "Crear horarios en lote"}
                    </button>
                  </div>
                </form>

                <div style={{ height: 16 }} />

                {/* Listado */}
                <div className="table-wrapper">
                  <table className="reservas-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Reservado</th>
                        <th className="cell-actions">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!horProId ? (
                        <tr>
                          <td colSpan={4}>Selecciona un profesional para ver sus horarios.</td>
                        </tr>
                      ) : (
                        (horariosPorProfesional[parseInt(horProId, 10)] || []).map((h) => (
                          <tr key={h.id}>
                            <td>{h.id}</td>
                            <td>{formatDateTime(h.fecha)}</td>
                            <td>{h.reservado ? "true" : "false"}</td>
                            <td className="cell-actions">
                              <button
                                type="button"
                                className="danger-btn"
                                disabled={h.reservado}
                                onClick={() => handleEliminarHorario(h)}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                      {horProId &&
                        (horariosPorProfesional[parseInt(horProId, 10)] || []).length === 0 && (
                          <tr>
                            <td colSpan={4}>No hay horarios para este profesional.</td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : agendaSection === "pacientes" ? (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h2>Pacientes</h2>
                  <p>Creación y listado de pacientes.</p>
                </div>

                {pacError && <div className="alert alert--error">{pacError}</div>}
                {pacSuccess && <div className="alert">{pacSuccess}</div>}

                <form className="reserva-form" onSubmit={handleCrearPacienteCentro}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Nombre completo</label>
                      <input
                        type="text"
                        value={pacForm.nombreCompleto}
                        onChange={(e) => setPacForm((p) => ({ ...p, nombreCompleto: e.target.value }))}
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div className="form-field">
                      <label>Email</label>
                      <input
                        type="email"
                        value={pacForm.email}
                        onChange={(e) => setPacForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="correo@dominio.cl"
                      />
                    </div>
                    <div className="form-field">
                      <label>Teléfono</label>
                      <input
                        type="text"
                        value={pacForm.telefono}
                        onChange={(e) =>
                          setPacForm((p) => ({ ...p, telefono: formatearTelefono(e.target.value) }))
                        }
                        placeholder="9 1234 5678"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <button className="primary-btn" type="submit" disabled={pacSubmitting}>
                      {pacSubmitting ? "Creando…" : "Crear paciente"}
                    </button>
                  </div>
                </form>

                <div style={{ height: 12 }} />

                <div className="table-wrapper">
                  <table className="reservas-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pacientes.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No hay pacientes.</td>
                        </tr>
                      ) : (
                        pacientes.map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{p.nombreCompleto}</td>
                            <td>{p.telefono || "—"}</td>
                            <td>{p.email || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // reservas
              <PanelReservas />
            )}
          </section>
        </div>
      </div>
    );
  }

  // ------------------ RENDER PRINCIPAL ------------------

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <div className="main-content">
          <LegacyTabs />

          {/* centro: menú */}
          {mode === "centro" ? (
            <CentroAgendaLayout />
          ) : view === "panel" ? (
            <PanelReservas />
          ) : (
            <FlujoPaciente />
          )}
        </div>
      </main>
    </div>
  );
}
