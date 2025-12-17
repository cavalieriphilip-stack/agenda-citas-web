import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './App.css'; 
import {
    API_BASE_URL, getPacientes, getProfesionales, getHorariosByProfesional,
    getReservasDetalle, crearReserva, crearPaciente, cancelarReserva, reagendarReserva,
    updatePaciente, deletePaciente, getConfiguraciones, deleteConfiguracion,
    buscarPacientePorRut, updateProfesional, deleteProfesional
} from './api';

// --- DATA MAESTRA ACTUALIZADA (Con Códigos y Descripción) ---
const TRATAMIENTOS = [
    { id: 1, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto online', valor: 20000, codigo: '1203001', descripcion: 'Evaluación completa por videollamada.' },
    { id: 2, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto presencial', valor: 35000, codigo: '1203002', descripcion: 'Evaluación presencial en consulta.' },
    { id: 3, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto domicilio - RM', valor: 30000, codigo: '1203003', descripcion: 'Visita domiciliaria en Región Metropolitana.' },
    { id: 4, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto domicilio - Alrededor RM', valor: 50000, codigo: '1203004', descripcion: 'Visita en alrededores RM.' },
    { id: 5, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto online', valor: 20000, codigo: '1203005', descripcion: 'Sesión de terapia online.' },
    { id: 6, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto presencial', valor: 35000, codigo: '1203006', descripcion: 'Sesión presencial.' },
    { id: 7, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto domicilio - RM', valor: 30000, codigo: '1203007', descripcion: 'Sesión a domicilio RM.' },
    { id: 8, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto domicilio - Alrededor RM', valor: 50000, codigo: '1203008', descripcion: 'Sesión a domicilio alrededores.' },
    { id: 9, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Otoscopía + Lavado de oídos', valor: 20000, codigo: '1203009', descripcion: 'Procedimiento clínico.' },
    { id: 10, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica infanto-juvenil online', valor: 20000, codigo: '1203010', descripcion: 'Evaluación online niños.' },
    { id: 11, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica presencial', valor: 35000, codigo: '1203011', descripcion: 'Evaluación presencial niños.' },
    { id: 12, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica domicilio - RM', valor: 30000, codigo: '1203012', descripcion: 'Domicilio niños RM.' },
    { id: 13, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica domicilio - Alrededor RM', valor: 50000, codigo: '1203013', descripcion: 'Domicilio niños alrededores.' },
    { id: 14, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica online', valor: 20000, codigo: '1203014', descripcion: 'Terapia online niños.' },
    { id: 15, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica presencial', valor: 35000, codigo: '1203015', descripcion: 'Terapia presencial niños.' },
    { id: 16, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica domicilio - RM', valor: 30000, codigo: '1203016', descripcion: 'Terapia domicilio RM.' },
    { id: 17, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica domicilio - Alrededor RM', valor: 50000, codigo: '1203017', descripcion: 'Terapia domicilio alrededores.' },
    { id: 18, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Otoscopía + Lavado de oídos', valor: 20000, codigo: '1203018', descripcion: 'Procedimiento niños.' },
    { id: 19, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Online', valor: 25000, codigo: '1204001', descripcion: 'Evaluación inicial online.' },
    { id: 20, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Presencial - Stgo Centro', valor: 35000, codigo: '1204002', descripcion: 'Evaluación Stgo Centro.' },
    { id: 21, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Presencial - Providencia', valor: 35000, codigo: '1204003', descripcion: 'Evaluación Providencia.' },
    { id: 24, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto online', valor: 25000, codigo: '1204004', descripcion: 'Sesión psicoterapia online.' },
    { id: 25, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto Presencial - Stgo Centro', valor: 35000, codigo: '1204005', descripcion: 'Sesión Stgo Centro.' },
    { id: 26, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto Presencial - Providencia', valor: 35000, codigo: '1204006', descripcion: 'Sesión Providencia.' },
    { id: 29, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil online', valor: 25000, codigo: '1204009', descripcion: 'Evaluación niños online.' },
    { id: 30, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil Presencial - Stgo Centro', valor: 35000, codigo: '1204010', descripcion: 'Evaluación niños Stgo Centro.' },
    { id: 31, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil Presencial - Providencia', valor: 35000, codigo: '1204011', descripcion: 'Evaluación niños Providencia.' },
    { id: 34, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil online', valor: 25000, codigo: '1204014', descripcion: 'Terapia niños online.' },
    { id: 35, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil Presencial - Stgo Centro', valor: 35000, codigo: '1204015', descripcion: 'Terapia niños Stgo Centro.' },
    { id: 36, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil Presencial - Providencia', valor: 35000, codigo: '1204016', descripcion: 'Terapia niños Providencia.' },
    { id: 39, especialidad: 'Matrona', tratamiento: 'Ginecología Infanto-Juvenil', valor: 16000, codigo: '1205001', descripcion: 'Atención especializada.' },
    { id: 41, especialidad: 'Matrona', tratamiento: 'Ginecología General', valor: 16000, codigo: '1205002', descripcion: 'Consulta general matrona.' },
    { id: 45, especialidad: 'Matrona', tratamiento: 'Asesoría de Lactancia', valor: 16000, codigo: '1205003', descripcion: 'Apoyo lactancia materna.' },
    { id: 54, especialidad: 'Psicopedagogía', tratamiento: 'Evaluación Psicopedagógica Online', valor: 20000, codigo: '1206001', descripcion: 'Evaluación aprendizaje.' },
    { id: 55, especialidad: 'Psicopedagogía', tratamiento: 'Sesión Psicopedagogía Online', valor: 20000, codigo: '1206002', descripcion: 'Sesión de apoyo.' },
];

const STEPS = [ {n:1, t:'Datos'}, {n:2, t:'Servicio'}, {n:3, t:'Agenda'}, {n:4, t:'Confirmar'} ];

// --- UTILS ---
const fmtMoney = (v) => `$${v.toLocaleString('es-CL')}`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('es-CL', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '-';
const toDateKey = (iso) => iso ? iso.split('T')[0] : '';
const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

const formatRut = (rut) => {
    if (!rut) return '';
    let value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (value.length < 2) return value;
    const body = value.slice(0, -1);
    const dv = value.slice(-1);
    const bodyDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${bodyDots}-${dv}`;
};

// --- NUEVOS COMPONENTES UI ---

function MobileAccordion({ title, subtitle, children }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="mobile-card">
            <div className={`mobile-card-header ${isOpen?'open':''}`} onClick={() => setIsOpen(!isOpen)}>
                <div className="mobile-card-title">
                    {title}
                    {subtitle && <span className="mobile-card-subtitle">{subtitle}</span>}
                </div>
                <div className="mobile-card-icon">{isOpen ? '−' : '+'}</div>
            </div>
            {isOpen && <div className="mobile-card-body">{children}</div>}
        </div>
    );
}

function MultiSelectDropdown({ options, selectedValues, onChange, label }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    const toggleOption = (value) => { if (selectedValues.includes(value)) onChange(selectedValues.filter(v => v !== value)); else onChange([...selectedValues, value]); };
    return (
        <div className="dropdown-wrapper" ref={wrapperRef}>
            <label className="form-label">{label}</label>
            <div className="dropdown-header" onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedValues.length > 0 ? `${selectedValues.length} seleccionados` : 'Seleccionar...'}</span><span>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && <div className="dropdown-list">{options.map(opt => (<div key={opt} className="dropdown-item" onClick={() => toggleOption(opt)}><input type="checkbox" checked={selectedValues.includes(opt)} readOnly /><span>{opt}</span></div>))}</div>}
        </div>
    );
}

function Modal({ title, children, onClose }) {
    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <h2 style={{marginTop:0, marginBottom:20}}>{title}</h2>
                {children}
            </div>
        </div>, document.body
    );
}

// --- APP PRINCIPAL ---
function App() {
    if (window.location.pathname.startsWith('/centro')) return <AdminLayout />;
    return <WebPaciente />;
}

function AdminLayout() {
    const [activeModule, setActiveModule] = useState('agenda');
    const [activeView, setActiveView] = useState('resumen');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const handleNavClick = (view) => { setActiveView(view); setMobileMenuOpen(false); }
    return (
        <div className="dashboard-layout">
            <nav className="top-nav">
                <div className="brand-area">
                    <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
                    <img src={LOGO_URL} alt="CISD Logo" className="cisd-logo-admin" />
                    <span className="admin-title-text">CISD Admin</span>
                </div>
                <div className="module-switcher">
                    <button className={`module-tab ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => {setActiveModule('agenda'); setActiveView('resumen');}}>Gestión Clínica</button>
                    <button className={`module-tab ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => {setActiveModule('finanzas'); setActiveView('reporte');}}>Finanzas</button>
                </div>
                <div className="nav-actions"><a href="/" className="btn-top-action">Web Paciente</a></div>
            </nav>
            <div className="workspace">
                {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>}
                <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">MENÚ {activeModule === 'agenda' ? 'AGENDA' : 'FINANZAS'}</div>
                    {activeModule === 'agenda' && ( <>
                        <div className={`nav-item ${activeView==='resumen'?'active':''}`} onClick={()=>handleNavClick('resumen')}>Resumen Agendamientos</div>
                        <div className={`nav-item ${activeView==='reservas'?'active':''}`} onClick={()=>handleNavClick('reservas')}>Nueva Reserva</div>
                        <div className={`nav-item ${activeView==='pacientes'?'active':''}`} onClick={()=>handleNavClick('pacientes')}>Administrar Pacientes</div>
                        <div className={`nav-item ${activeView==='profesionales'?'active':''}`} onClick={()=>handleNavClick('profesionales')}>Administrar Profesionales</div>
                        <div className={`nav-item ${activeView==='horarios'?'active':''}`} onClick={()=>handleNavClick('horarios')}>Administrar Horarios</div>
                    </> )}
                    {activeModule === 'finanzas' && <div className={`nav-item ${activeView==='reporte'?'active':''}`} onClick={()=>handleNavClick('reporte')}>Dashboard Financiero</div>}
                </aside>
                <main className="main-stage"><DashboardContent module={activeModule} view={activeView} /></main>
            </div>
        </div>
    );
}

function DashboardContent({ module, view }) {
    const [reservas, setReservas] = useState([]);
    const refreshData = async () => { try { const data = await getReservasDetalle(); setReservas(data); } catch(e) { console.error(e); } };
    useEffect(() => { refreshData(); }, []);
    if (module === 'agenda') {
        if (view === 'resumen') return <AgendaResumen reservas={reservas} reload={refreshData} />;
        if (view === 'reservas') return <AgendaNuevaReserva reload={refreshData} reservas={reservas} />;
        if (view === 'pacientes') return <AgendaPacientes />;
        if (view === 'profesionales') return <AgendaProfesionales />;
        if (view === 'horarios') return <AgendaHorarios />;
    }
    if (module === 'finanzas') {
        const total = reservas.reduce((acc, r) => { const m = TRATAMIENTOS.find(t => r.motivo.includes(t.tratamiento)); return acc + (m ? m.valor : 0); }, 0);
        return <FinanzasReporte total={total} count={reservas.length} reservas={reservas} />;
    }
    return <div>Cargando...</div>;
}

function AgendaNuevaReserva({ reload, reservas }) {
    const [pacientes, setPacientes] = useState([]);
    const [pros, setPros] = useState([]);
    const [horarios, setHorarios] = useState([]);
    const [form, setForm] = useState({ pacienteId: '', profesionalId: '', horarioId: '', motivo: '', especialidad: '', tratamientoId: '' });
    useEffect(() => { getPacientes().then(setPacientes); getProfesionales().then(setPros); }, []);
    const especialidades = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const prestaciones = TRATAMIENTOS.filter(t => t.especialidad === form.especialidad);
    const prosFiltrados = form.tratamientoId ? pros.filter(p => { const trat = TRATAMIENTOS.find(x => x.id === parseInt(form.tratamientoId)); return trat && p.tratamientos && p.tratamientos.includes(trat.tratamiento); }) : [];
    const handlePro = async (pid) => {
        setForm({ ...form, profesionalId: pid });
        setHorarios([]);
        if (!pid || pid === "") return; 
        try { const h = await getHorariosByProfesional(pid); if (Array.isArray(h)) { setHorarios(h); } else { setHorarios([]); } } catch(e) { setHorarios([]); }
    }
    const save = async (e) => {
        e.preventDefault();
        if (!form.tratamientoId) return alert("Tratamiento obligatorio");
        const trat = TRATAMIENTOS.find(t => t.id === parseInt(form.tratamientoId));
        try { await crearReserva({ pacienteId: parseInt(form.pacienteId), profesionalId: parseInt(form.profesionalId), horarioDisponibleId: form.horarioId, motivo: trat.tratamiento }); alert('Creada con éxito'); reload(); } catch (e) { alert('Error al crear reserva'); }
    };
    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Nueva Reserva Manual</h1></div></div>
            <div className="pro-card">
                <form onSubmit={save}>
                    <div className="input-row">
                        <div><label className="form-label">Especialidad</label><select className="form-control" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value, tratamientoId: '' })}><option value="">Seleccionar...</option>{especialidades.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                        <div><label className="form-label">Tratamiento</label><select className="form-control" disabled={!form.especialidad} onChange={e => setForm({ ...form, tratamientoId: e.target.value })}><option value="">Seleccionar...</option>{prestaciones.map(t => <option key={t.id} value={t.id}>{t.tratamiento}</option>)}</select></div>
                    </div>
                    <div className="input-row">
                        <div><label className="form-label">Paciente</label><select className="form-control" onChange={e => setForm({ ...form, pacienteId: e.target.value })}><option value="">Seleccionar...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto} ({formatRut(p.rut)})</option>)}</select></div>
                        <div><label className="form-label">Profesional</label><select className="form-control" disabled={!form.tratamientoId} onChange={e => handlePro(e.target.value)}><option value="">Seleccionar...</option>{prosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select></div>
                    </div>
                    <div style={{ marginBottom: 20 }}><label className="form-label">Horario</label><select className="form-control" onChange={e => setForm({ ...form, horarioId: e.target.value })}><option value="">Seleccionar...</option>{Array.isArray(horarios) && horarios.map(h => <option key={h.id} value={h.id}>{fmtDate(h.fecha)}</option>)}</select></div>
                    <button className="btn-primary">Crear Reserva</button>
                </form>
            </div>
            <h3 style={{ marginTop: 40 }}>Reservas Recientes</h3>
            <div className="pro-card" style={{ padding: 0 }}>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead><tr><th>Fecha</th><th>Paciente</th><th>Profesional</th></tr></thead>
                        <tbody>{reservas.slice(0, 5).map(r => (<tr key={r.id}><td>{fmtDate(r.fecha)}</td><td>{r.pacienteNombre}</td><td>{r.profesionalNombre}</td></tr>))}</tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function AgendaResumen({reservas, reload}){
    const [editId,setEditId]=useState(null);
    const [pros,setPros]=useState([]);
    const [editProId, setEditProId] = useState('');
    const [editEspecialidad, setEditEspecialidad] = useState('');
    const [editTratamiento, setEditTratamiento] = useState('');
    const [editHorarioId, setEditHorarioId] = useState('');
    const [horariosDisponibles, setHorariosDisponibles] = useState([]);

    useEffect(()=>{getProfesionales().then(setPros)},[]);

    const startEdit=async(r)=>{
        setEditId(r.id);
        setEditProId(r.profesionalId.toString());
        const matchTratamiento = TRATAMIENTOS.find(t => r.motivo.includes(t.tratamiento));
        const especialidadInicial = matchTratamiento ? matchTratamiento.especialidad : '';
        setEditEspecialidad(especialidadInicial);
        setEditTratamiento(r.motivo);
        const h = await getHorariosByProfesional(r.profesionalId);
        setHorariosDisponibles(Array.isArray(h) ? h : []);
    };

    const handleProChange = async(pid) => {
        setEditProId(pid); setEditEspecialidad(''); setEditTratamiento(''); setEditHorarioId('');
        if (pid) { const h = await getHorariosByProfesional(pid); setHorariosDisponibles(Array.isArray(h) ? h : []); } else { setHorariosDisponibles([]); }
    };

    const getEspecialidadesPro = () => {
        const p = pros.find(x => x.id === parseInt(editProId));
        if (!p || !p.especialidad) return [];
        return p.especialidad.split(',');
    };

    const getTratamientosFiltrados = () => {
        const p = pros.find(x => x.id === parseInt(editProId));
        if (!p || !editEspecialidad) return [];
        const teoricos = TRATAMIENTOS.filter(t => t.especialidad === editEspecialidad);
        if (!p.tratamientos) return [];
        const proTrats = p.tratamientos.split(',');
        return teoricos.filter(t => proTrats.includes(t.tratamiento));
    };

    const saveEdit=async(id)=>{
        if(!editHorarioId) return alert('Selecciona hora');
        try{ await reagendarReserva(id, editHorarioId, editProId, editTratamiento); alert('Modificado'); setEditId(null); reload(); }catch(e){alert('Error')}
    };

    const deleteReserva = async(id) => { if(confirm('¿Eliminar?')){await cancelarReserva(id);reload()} };

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Resumen de Agendamientos</h1></div></div>
            <div className="pro-card">
                {/* VISTA ESCRITORIO (TABLA) */}
                <div className="data-table-container desktop-view-only">
                    <table className="data-table">
                        <thead><tr><th>Fecha</th><th>Paciente</th><th>Profesional</th><th>Tratamiento</th><th>Valor</th><th>Acciones</th></tr></thead>
                        <tbody>{reservas.map(r=>{
                            const match=TRATAMIENTOS.find(t=>r.motivo.includes(t.tratamiento));
                            const valor = match ? match.valor : 0;
                            if(editId===r.id) return (
                                <tr key={r.id} style={{background:'#fff9c4'}}>
                                    <td colSpan={6}>
                                        <div style={{padding:15, display:'flex', flexDirection:'column', gap:10}}>
                                            <strong>Reprogramar Cita</strong>
                                            <div className="input-row">
                                                <div><label className="form-label">Profesional</label><select className="form-control" value={editProId} onChange={e=>handleProChange(e.target.value)}>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select></div>
                                                <div><label className="form-label">Especialidad</label><select className="form-control" value={editEspecialidad} onChange={e=>setEditEspecialidad(e.target.value)} disabled={!editProId}><option value="">Seleccionar...</option>{getEspecialidadesPro().map(e=><option key={e} value={e}>{e}</option>)}</select></div>
                                                <div><label className="form-label">Tratamiento</label><select className="form-control" value={editTratamiento} onChange={e=>setEditTratamiento(e.target.value)} disabled={!editEspecialidad}><option value="">Seleccionar...</option>{getTratamientosFiltrados().map(t=><option key={t.id} value={t.tratamiento}>{t.tratamiento}</option>)}</select></div>
                                            </div>
                                            <div className="input-row">
                                                <div style={{maxWidth:300}}><label className="form-label">Nuevo Horario</label><select className="form-control" value={editHorarioId} onChange={e=>setEditHorarioId(e.target.value)} disabled={!editTratamiento}><option value="">Selecciona hora...</option>{horariosDisponibles.map(h=><option key={h.id} value={h.id}>{fmtDate(h.fecha)}</option>)}</select></div>
                                                <div style={{display:'flex', alignItems:'flex-end', gap:10}}><button className="btn-primary" onClick={()=>saveEdit(r.id)}>Guardar</button><button className="btn-edit" onClick={()=>setEditId(null)}>Cancelar</button></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                            return(
                                <tr key={r.id}>
                                    <td>{fmtDate(r.fecha)}</td>
                                    <td><strong>{r.pacienteNombre}</strong><br/><small>{r.pacienteEmail}</small></td>
                                    <td>{r.profesionalNombre}</td>
                                    <td>{r.motivo}</td>
                                    <td>{fmtMoney(valor)}</td>
                                    <td><button className="btn-edit" onClick={()=>startEdit(r)}>Modificar</button><button className="btn-danger" onClick={()=>deleteReserva(r.id)}>Eliminar</button></td>
                                </tr>
                            )
                        })}</tbody>
                    </table>
                </div>

                {/* VISTA MÓVIL (ACORDEONES) */}
                <div className="mobile-view-only">
                    {reservas.map(r => {
                        const match=TRATAMIENTOS.find(t=>r.motivo.includes(t.tratamiento));
                        const valor = match ? match.valor : 0;
                        return (
                            <MobileAccordion 
                                key={r.id} 
                                title={fmtDate(r.fecha)} 
                                subtitle={r.pacienteNombre}
                            >
                                <div className="mobile-data-row"><span className="mobile-label">Profesional</span><span className="mobile-value">{r.profesionalNombre}</span></div>
                                <div className="mobile-data-row"><span className="mobile-label">Tratamiento</span><span className="mobile-value">{r.motivo}</span></div>
                                <div className="mobile-data-row"><span className="mobile-label">Valor</span><span className="mobile-value">{fmtMoney(valor)}</span></div>
                                <div style={{marginTop:15}}>
                                    <button className="btn-danger" onClick={()=>deleteReserva(r.id)} style={{width:'100%'}}>Eliminar Cita</button>
                                </div>
                            </MobileAccordion>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function AgendaPacientes(){
    const [pacientes,setPacientes]=useState([]);
    const [form,setForm]=useState({nombreCompleto:'',email:'',telefono:'', rut:''});
    const [editingId, setEditingId] = useState(null);
    const load=()=>getPacientes().then(setPacientes);
    useEffect(()=>{load()},[]);
    const handleRutChange = (e) => { const raw = e.target.value; const formatted = formatRut(raw); setForm({...form, rut: formatted}); }
    const save=async(e)=>{
        e.preventDefault();
        try {
            if(editingId) { await updatePaciente(editingId, form); alert('Paciente Actualizado'); setEditingId(null); } 
            else { await crearPaciente(form); alert('Paciente Creado'); }
            setForm({nombreCompleto:'',email:'',telefono:'', rut:''}); load();
        } catch(e) { alert("Error al guardar paciente"); }
    };
    const handleEdit = (p) => { setForm({ nombreCompleto: p.nombreCompleto, email: p.email, telefono: p.telefono, rut: formatRut(p.rut||'') }); setEditingId(p.id); window.scrollTo(0, 0); };
    const handleDelete = async (id) => { if(confirm('¿Seguro?')) { await deletePaciente(id); load(); } };

    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Pacientes</h1></div></div>
            <div className="pro-card">
                <h3 style={{marginTop:0}}>{editingId ? 'Editar Paciente' : 'Crear Nuevo Paciente'}</h3>
                <form onSubmit={save}>
                    <div className="input-row">
                        <div><label className="form-label">RUT (Ej: 12.345.678-9)</label><input className="form-control" value={form.rut} onChange={handleRutChange} maxLength={12} placeholder="12.345.678-9"/></div>
                        <div><label className="form-label">Nombre Completo</label><input className="form-control" value={form.nombreCompleto} onChange={e=>setForm({...form,nombreCompleto:e.target.value})}/></div>
                    </div>
                    <div className="input-row">
                        <div><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
                        <div><label className="form-label">Teléfono</label><input className="form-control" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></div>
                    </div>
                    <button className="btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Paciente'}</button>
                    {editingId && <button type="button" className="btn-edit" onClick={()=>{setEditingId(null); setForm({nombreCompleto:'',email:'',telefono:'', rut:''})}} style={{marginLeft:10}}>Cancelar</button>}
                </form>
            </div>
            <div className="pro-card">
                {/* VISTA ESCRITORIO */}
                <div className="data-table-container desktop-view-only">
                    <table className="data-table">
                        <thead><tr><th>RUT</th><th>Nombre</th><th>Email</th><th>Acciones</th></tr></thead>
                        <tbody>{pacientes.map(p=>(
                            <tr key={p.id}>
                                <td>{formatRut(p.rut)}</td><td>{p.nombreCompleto}</td><td>{p.email}</td>
                                <td><button className="btn-edit" onClick={()=>handleEdit(p)}>Editar</button><button className="btn-danger" onClick={()=>handleDelete(p.id)}>Borrar</button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
                {/* VISTA MÓVIL */}
                <div className="mobile-view-only">
                    {pacientes.map(p => (
                        <MobileAccordion key={p.id} title={p.nombreCompleto}>
                            <div className="mobile-data-row"><span className="mobile-label">RUT</span><span className="mobile-value">{formatRut(p.rut)}</span></div>
                            <div className="mobile-data-row"><span className="mobile-label">Email</span><span className="mobile-value">{p.email}</span></div>
                            <div className="mobile-data-row"><span className="mobile-label">Teléfono</span><span className="mobile-value">{p.telefono}</span></div>
                            <div style={{marginTop:15}}>
                                <button className="btn-edit" onClick={()=>handleEdit(p)}>Editar</button>
                                <button className="btn-danger" onClick={()=>handleDelete(p.id)}>Borrar</button>
                            </div>
                        </MobileAccordion>
                    ))}
                </div>
            </div>
        </div>
    )
}

function AgendaProfesionales() {
    const [pros, setPros] = useState([]);
    const [form, setForm] = useState({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] });
    const [isEditing, setIsEditing] = useState(false);
    const especialidadesUnicas = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const tratamientosDisponibles = TRATAMIENTOS.filter(t => form.especialidades.includes(t.especialidad)).map(t=>t.tratamiento);
    const load = () => getProfesionales().then(setPros);
    useEffect(() => { load(); }, []);
    const handleSpecChange = (newSpecs) => setForm({ ...form, especialidades: newSpecs });
    const handleTratChange = (newTrats) => setForm({ ...form, tratamientos: newTrats });
    const handleEdit = (p) => {
        setForm({ id: p.id, nombreCompleto: p.nombreCompleto, especialidades: p.especialidad ? p.especialidad.split(',') : [], tratamientos: p.tratamientos ? p.tratamientos.split(',') : [] });
        setIsEditing(true); window.scrollTo(0,0);
    };
    const save = async (e) => {
        e.preventDefault(); if (form.especialidades.length === 0) return alert("Selecciona especialidad");
        const payload = { nombreCompleto: form.nombreCompleto, especialidad: form.especialidades.join(','), tratamientos: form.tratamientos.join(',') };
        try { if (isEditing) await updateProfesional(form.id, payload); else await fetch(`${API_BASE_URL}/profesionales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); alert('Guardado'); setIsEditing(false); setForm({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] }); load(); } catch (e) { alert("Error"); }
    }
    const handleDelete = async (id) => { if(confirm('¿Eliminar?')) { await deleteProfesional(id); load(); } };

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Profesionales</h1></div></div>
            <div className="pro-card">
                <h3 style={{marginTop:0}}>{isEditing ? 'Editar Profesional' : 'Nuevo Profesional'}</h3>
                <form onSubmit={save}>
                    <div className="input-row" style={{marginBottom:15}}>
                        <div style={{width:'100%'}}><label className="form-label">Nombre Completo</label><input className="form-control" value={form.nombreCompleto} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} /></div>
                    </div>
                    <div className="input-row">
                        <div><MultiSelectDropdown label="Especialidades" options={especialidadesUnicas} selectedValues={form.especialidades} onChange={handleSpecChange} /></div>
                        <div><MultiSelectDropdown label="Tratamientos Habilitados" options={tratamientosDisponibles} selectedValues={form.tratamientos} onChange={handleTratChange} /></div>
                    </div>
                    <div style={{display:'flex', gap:10}}>
                        <button className="btn-primary">{isEditing ? 'Guardar' : 'Crear'}</button>
                        {isEditing && <button type="button" className="btn-edit" onClick={()=>{setIsEditing(false); setForm({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] })}}>Cancelar</button>}
                    </div>
                </form>
            </div>
            
            <div className="pro-card">
                {/* VISTA ESCRITORIO */}
                <div className="data-table-container desktop-view-only">
                    <table className="data-table">
                        <thead><tr><th>Nombre</th><th>Especialidades</th><th>Acciones</th></tr></thead>
                        <tbody>{pros.map(p => (
                            <tr key={p.id}>
                                <td><strong>{p.nombreCompleto}</strong></td>
                                <td>{p.especialidad ? p.especialidad.split(',').join(', ') : '-'}</td>
                                <td><button className="btn-edit" onClick={() => handleEdit(p)}>Editar</button><button className="btn-danger" onClick={() => handleDelete(p.id)}>X</button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
                {/* VISTA MÓVIL */}
                <div className="mobile-view-only">
                    {pros.map(p => (
                        <MobileAccordion key={p.id} title={p.nombreCompleto}>
                            <div className="mobile-data-row"><span className="mobile-label">Especialidades</span><span className="mobile-value">{p.especialidad || '-'}</span></div>
                            <div className="mobile-data-row"><span className="mobile-label">Tratamientos</span><span className="mobile-value">{p.tratamientos || '-'}</span></div>
                            <div style={{marginTop:15}}>
                                <button className="btn-edit" onClick={() => handleEdit(p)}>Editar</button>
                                <button className="btn-danger" onClick={() => handleDelete(p.id)}>Eliminar</button>
                            </div>
                        </MobileAccordion>
                    ))}
                </div>
            </div>
        </div>
    )
}

function AgendaHorarios(){
    const [pros,setPros]=useState([]);
    const [configs, setConfigs] = useState([]);
    const [fechaSel, setFechaSel] = useState('');
    const [form,setForm]=useState({profesionalId:'',diaSemana:'',horaInicio:'09:00',horaFin:'18:00', duracionSlot: 30, intervalo: 0});
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState({ proName: '', slots: {} });

    useEffect(()=>{ getProfesionales().then(setPros); loadConfigs(); },[]);
    const loadConfigs = async () => { try { const data = await getConfiguraciones(); setConfigs(Array.isArray(data) ? data : []); } catch (e) { setConfigs([]); } };
    const save=async(e)=>{
        e.preventDefault(); const payload = { ...form, fecha: fechaSel }; 
        await fetch(`${API_BASE_URL}/configuracion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        alert(`Horario guardado`); await loadConfigs();
    };
    const borrarConfig = async (id) => { if(confirm("¿Eliminar?")) { await deleteConfiguracion(id); loadConfigs(); } }
    
    const verCalendario = async (p) => {
        try {
            const h = await getHorariosByProfesional(p.id);
            if(Array.isArray(h)) {
                const agrupados = h.reduce((acc, curr) => { const f = curr.fecha.split('T')[0]; if(!acc[f]) acc[f] = []; acc[f].push(curr); return acc; }, {});
                setModalData({ proName: p.nombreCompleto, slots: agrupados });
                setShowModal(true);
            }
        } catch(e) { alert("Error cargando horarios"); }
    };

    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Configuración de Horarios</h1></div></div>
            <div className="pro-card">
                <form onSubmit={save}>
                    <div className="input-row">
                        <div><label className="form-label">Profesional</label><select className="form-control" onChange={e=>setForm({...form,profesionalId:e.target.value})}><option>Seleccionar...</option>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select></div>
                        <div><label className="form-label">Fecha</label><input type="date" className="form-control" onChange={e=>setFechaSel(e.target.value)} /></div>
                    </div>
                    <div className="input-row">
                        <div><label className="form-label">Inicio</label><input type="time" className="form-control" value={form.horaInicio} onChange={e=>setForm({...form,horaInicio:e.target.value})}/></div>
                        <div><label className="form-label">Fin</label><input type="time" className="form-control" value={form.horaFin} onChange={e=>setForm({...form,horaFin:e.target.value})}/></div>
                    </div>
                    <button className="btn-primary">Guardar Disponibilidad</button>
                </form>
            </div>

            <div className="pro-card">
                <h3>Ver Calendario Visual</h3>
                {/* VISTA ESCRITORIO */}
                <div className="data-table-container desktop-view-only">
                    <table className="data-table">
                        <thead><tr><th>Profesional</th><th>Acción</th></tr></thead>
                        <tbody>{pros.map(p=>(
                            <tr key={p.id}>
                                <td>{p.nombreCompleto}</td>
                                <td><button className="btn-edit" onClick={()=>verCalendario(p)}>Ver Horarios</button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
                {/* VISTA MÓVIL */}
                <div className="mobile-view-only">
                    {pros.map(p => (
                        <div key={p.id} className="mobile-simple-list-item">
                            <strong style={{fontSize:'0.95rem'}}>{p.nombreCompleto}</strong>
                            <button className="btn-edit" onClick={()=>verCalendario(p)} style={{margin:0}}>Ver Horarios</button>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <Modal title={`Horarios: ${modalData.proName}`} onClose={()=>setShowModal(false)}>
                    {Object.keys(modalData.slots).length === 0 ? <p>No hay horarios.</p> : 
                        Object.entries(modalData.slots).sort().map(([fecha, slots]) => (
                            <div key={fecha} style={{marginBottom:15, borderBottom:'1px solid #eee', paddingBottom:10}}>
                                <strong>{new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {weekday:'long', day:'numeric', month:'long'})}</strong>
                                <div style={{display:'flex', gap:5, flexWrap:'wrap', marginTop:5}}>
                                    {slots.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(s => (
                                        <span key={s.id} style={{background:'#f3f4f6', padding:'4px 8px', borderRadius:4, fontSize:'0.85rem'}}>
                                            {new Date(s.fecha).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    }
                </Modal>
            )}
        </div>
    )
}

function FinanzasReporte({total,count,reservas}){
    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Reporte Financiero</h1></div></div>
            <div className="kpi-grid">
                <div className="kpi-box"><div className="kpi-label">Ingresos Totales</div><div className="kpi-value">{fmtMoney(total)}</div></div>
                <div className="kpi-box"><div className="kpi-label">Citas Agendadas</div><div className="kpi-value">{count}</div></div>
            </div>
        </div>
    )
}

function WebPaciente() {
    const [step, setStep] = useState(0); 
    const [profesionales, setProfesionales] = useState([]);
    const [form, setForm] = useState({ rut:'', nombre:'', email:'', telefono:'', especialidad:'', tratamientoId:'', profesionalId:'', horarioId:'' });
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [pacienteId, setPacienteId] = useState(null);
    
    // Estados agenda
    const [multiAgenda, setMultiAgenda] = useState({}); 
    const [selectedDateKey, setSelectedDateKey] = useState(null); 
    const [availableDates, setAvailableDates] = useState([]); 

    useEffect(()=>{ getProfesionales().then(setProfesionales) },[]);

    const especialidades = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const prestaciones = TRATAMIENTOS.filter(t => t.especialidad === form.especialidad);
    const tratamientoSel = TRATAMIENTOS.find(t => t.id === parseInt(form.tratamientoId));
    
    // --- LÓGICA ---
    const handleRutSearch = async () => {
        if(!form.rut) return alert("Ingrese su RUT");
        setLoading(true);
        try {
            const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); 
            const paciente = await buscarPacientePorRut(rutLimpio);
            if (paciente) {
                setPacienteId(paciente.id);
                setForm(prev => ({...prev, nombre: paciente.nombreCompleto, email: paciente.email, telefono: paciente.telefono}));
                setStep(2); // Salta registro
            } else { 
                setStep(1); // Va a registro
            }
        } catch(e) { setStep(1); }
        setLoading(false);
    };

    const handleTreatmentConfirm = async () => {
        setLoading(true);
        const prosAptos = profesionales.filter(p => p.tratamientos && p.tratamientos.includes(tratamientoSel.tratamiento));
        
        if (prosAptos.length === 0) {
            alert("No hay profesionales disponibles para este tratamiento.");
            setLoading(false); return;
        }

        const promises = prosAptos.map(async p => {
            const horarios = await getHorariosByProfesional(p.id);
            return { profesional: p, slots: Array.isArray(horarios) ? horarios.filter(x => new Date(x.fecha) > new Date()) : [] };
        });

        const results = await Promise.all(promises);
        const agendaMap = {};
        const datesSet = new Set();

        results.forEach(({profesional, slots}) => {
            slots.forEach(slot => {
                const dateKey = toDateKey(slot.fecha);
                datesSet.add(dateKey);
                if (!agendaMap[dateKey]) agendaMap[dateKey] = [];
                let proEntry = agendaMap[dateKey].find(entry => entry.profesional.id === profesional.id);
                if (!proEntry) { proEntry = { profesional, slots: [] }; agendaMap[dateKey].push(proEntry); }
                proEntry.slots.push(slot);
            });
        });

        const sortedDates = Array.from(datesSet).sort();
        setMultiAgenda(agendaMap);
        setAvailableDates(sortedDates);
        
        if (sortedDates.length > 0) setSelectedDateKey(sortedDates[0]);
        else alert("No hay horas disponibles próximamente.");
        
        setLoading(false);
        if (sortedDates.length > 0) setStep(3);
    };

    const selectSlot = (pid, hid) => {
        setForm(prev => ({ ...prev, profesionalId: pid, horarioId: hid }));
        setStep(4);
    };

    const confirmar = async () => {
        setLoading(true);
        try {
            let pid = pacienteId;
            if (!pid) {
                const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); 
                const pac = await crearPaciente({nombreCompleto:form.nombre, email:form.email, telefono:form.telefono, rut: rutLimpio});
                pid = pac.id;
            }
            await crearReserva({ pacienteId: pid, profesionalId: form.profesionalId, horarioDisponibleId: form.horarioId, motivo: `${tratamientoSel.tratamiento}` });
            setBookingSuccess(true);
        } catch(e) { alert('Error al procesar reserva.'); }
        setLoading(false);
    }

    // Navegación hacia atrás
    const goBack = () => {
        if(step === 0) return;
        if(step === 2 && pacienteId) setStep(0); // Si ya existía, volver al inicio
        else setStep(step - 1);
    };

    // Componente de Detalle de Reserva
    const ReservaDetalleCard = ({ title, showTotal }) => {
        // Encontrar datos para mostrar
        const slotDate = new Date(form.horarioId || new Date());
        const fechaStr = slotDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const horaStr = slotDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        
        // Buscar profesional en la agenda cargada
        let proName = "Profesional asignado";
        if (multiAgenda[selectedDateKey]) {
            const foundEntry = multiAgenda[selectedDateKey].find(e => e.profesional.id === form.profesionalId);
            if (foundEntry) proName = foundEntry.profesional.nombreCompleto;
        }

        return (
            <div className="conf-card">
                <div className="conf-section">
                    <div className="conf-title">Paciente</div>
                    <div className="conf-row"><span className="conf-label">Nombre</span><span className="conf-value">{form.nombre}</span></div>
                    <div className="conf-row"><span className="conf-label">RUT</span><span className="conf-value">{form.rut}</span></div>
                    <div className="conf-row"><span className="conf-label">Email</span><span className="conf-value">{form.email}</span></div>
                </div>
                
                <div className="conf-section">
                    <div className="conf-title">Servicio</div>
                    <div className="conf-row"><span className="conf-label">Especialidad</span><span className="conf-value">{tratamientoSel?.especialidad}</span></div>
                    <div className="conf-row"><span className="conf-label">Tratamiento</span><span className="conf-value">{tratamientoSel?.tratamiento}</span></div>
                    {tratamientoSel?.codigo && <div className="conf-row"><span className="conf-label">Cód. Fonasa</span><span className="conf-value">{tratamientoSel.codigo}</span></div>}
                    <div className="conf-row"><span className="conf-label" style={{fontStyle:'italic', fontSize:'0.85rem', marginTop:5}}>{tratamientoSel?.descripcion}</span></div>
                </div>

                <div className="conf-section">
                    <div className="conf-title">Cita</div>
                    <div className="conf-row"><span className="conf-label">Profesional</span><span className="conf-value">{proName}</span></div>
                    <div className="conf-row"><span className="conf-label">Fecha</span><span className="conf-value">{fechaStr}</span></div>
                    <div className="conf-row"><span className="conf-label">Hora</span><span className="conf-value">{horaStr}</span></div>
                </div>

                {showTotal && (
                    <div className="conf-section" style={{background:'#fafafa'}}>
                        <div className="conf-total">
                            <span className="conf-total-label">Total a Pagar</span>
                            <span className="conf-total-value">{fmtMoney(tratamientoSel?.valor || 0)}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // VISTA DE ÉXITO
    if(bookingSuccess) {
        return (
            <div className="web-shell">
                <div className="web-content success-card">
                    <span className="success-icon-big">✓</span>
                    <h1 className="web-title">¡Reserva Exitosa!</h1>
                    <p className="web-subtitle">Hemos enviado el comprobante a<br/><strong>{form.email}</strong></p>
                    
                    <ReservaDetalleCard title="Comprobante" showTotal={true} />
                    
                    <button className="btn-block-action" onClick={()=>window.location.reload()}>Volver al Inicio</button>
                </div>
            </div>
        )
    }

    // RENDER PRINCIPAL
    return (
        <div className="web-shell">
            {/* Header Fijo con Flecha Atrás */}
            <header className="web-header">
                {step > 0 && <button className="web-back-btn" onClick={goBack}>‹</button>}
                <img src={LOGO_URL} alt="Logo" className="cisd-logo-web" />
            </header>

            {/* Stepper Visual */}
            <div className="stepper-container">
                <div className="stepper">
                    <div className={`step-dot ${step >= 0 ? 'active' : ''}`}></div>
                    <div className={`step-line ${step >= 1 ? 'filled' : ''}`}></div>
                    <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
                    <div className={`step-line ${step >= 2 ? 'filled' : ''}`}></div>
                    <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
                    <div className={`step-line ${step >= 3 ? 'filled' : ''}`}></div>
                    <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
                </div>
            </div>

            <div className="web-content">
                
                {/* PASO 0: RUT */}
                {step === 0 && (
                    <>
                        <div>
                            <h2 className="web-title">Bienvenido</h2>
                            <p className="web-subtitle">Agenda tu hora médica fácil y rápido.</p>
                        </div>
                        <div className="input-group">
                            <label className="web-label">Ingresa tu RUT</label>
                            <input 
                                className="web-input" 
                                placeholder="Ej: 12.345.678-9" 
                                value={form.rut} 
                                onChange={e=>setForm({...form, rut: formatRut(e.target.value)})}
                                maxLength={12}
                                autoFocus
                            />
                        </div>
                        <div className="bottom-bar">
                            <button className="btn-block-action" disabled={!form.rut || loading} onClick={handleRutSearch}>
                                {loading ? 'Cargando...' : 'Comenzar'}
                            </button>
                        </div>
                    </>
                )}

                {/* PASO 1: REGISTRO */}
                {step === 1 && (
                    <>
                        <h2 className="web-title">Datos Personales</h2>
                        <p className="web-subtitle">Es tu primera vez, crea tu ficha.</p>
                        
                        <div className="input-group">
                            <label className="web-label">Nombre Completo</label>
                            <input className="web-input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} placeholder="Tu nombre"/>
                        </div>
                        <div className="input-group">
                            <label className="web-label">Correo Electrónico</label>
                            <input className="web-input" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="ejemplo@correo.com"/>
                        </div>
                        <div className="input-group">
                            <label className="web-label">Teléfono Móvil</label>
                            <input className="web-input" type="tel" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} placeholder="+56 9..."/>
                        </div>

                        <div className="bottom-bar">
                            <button className="btn-block-action" disabled={!form.nombre || !form.email} onClick={()=>setStep(2)}>
                                Guardar Datos
                            </button>
                        </div>
                    </>
                )}

                {/* PASO 2: SERVICIO */}
                {step === 2 && (
                    <>
                        <h2 className="web-title">¿Qué necesitas?</h2>
                        <p className="web-subtitle">Hola <b>{form.nombre.split(' ')[0]}</b>, selecciona tu atención.</p>

                        <div className="input-group">
                            <label className="web-label">Especialidad</label>
                            <select className="web-select" value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value, tratamientoId:''})}>
                                <option value="">Selecciona una opción...</option>
                                {especialidades.map(e=><option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="web-label">Tratamiento / Motivo</label>
                            <select className="web-select" disabled={!form.especialidad} value={form.tratamientoId} onChange={e=>setForm({...form, tratamientoId:e.target.value})}>
                                <option value="">Selecciona una opción...</option>
                                {prestaciones.map(p=><option key={p.id} value={p.id}>{p.tratamiento}</option>)}
                            </select>
                        </div>

                        <div className="bottom-bar">
                            <button className="btn-block-action" disabled={!form.tratamientoId || loading} onClick={handleTreatmentConfirm}>
                                {loading ? 'Buscando...' : 'Buscar Horas Disponibles'}
                            </button>
                        </div>
                    </>
                )}

                {/* PASO 3: AGENDA */}
                {step === 3 && (
                    <>
                        <h2 className="web-title">Elige tu Hora</h2>
                        <p className="web-subtitle">Selecciona el día y horario que prefieras.</p>
                        
                        <div className="rs-date-tabs">
                            {availableDates.map(dateStr => {
                                const dateObj = new Date(dateStr + 'T00:00:00');
                                const isSelected = selectedDateKey === dateStr;
                                return (
                                    <div key={dateStr} className={`rs-date-tab ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedDateKey(dateStr)}>
                                        <div className="rs-day-name">{dateObj.toLocaleDateString('es-CL', {weekday: 'short'})}</div>
                                        <div className="rs-day-number">{dateObj.getDate()}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="rs-pro-list">
                            {multiAgenda[selectedDateKey]?.map((entry) => (
                                <div key={entry.profesional.id} className="rs-pro-card">
                                    <div className="rs-pro-header">
                                        <div className="rs-avatar-circle">{entry.profesional.nombreCompleto.charAt(0)}</div>
                                        <div className="rs-pro-details">
                                            <strong>{entry.profesional.nombreCompleto}</strong>
                                            <span>{entry.profesional.especialidad}</span>
                                        </div>
                                    </div>
                                    <div className="rs-slots-grid">
                                        {entry.slots.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(slot => (
                                            <button key={slot.id} className="rs-slot-btn" onClick={() => selectSlot(entry.profesional.id, slot.id)}>
                                                {new Date(slot.fecha).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* PASO 4: CONFIRMAR DETALLADO */}
                {step === 4 && (
                    <>
                        <h2 className="web-title">Confirmar Reserva</h2>
                        <p className="web-subtitle">Revisa los detalles antes de finalizar.</p>

                        <ReservaDetalleCard title="Resumen" showTotal={true} />

                        <div className="bottom-bar">
                            <button className="btn-block-action" disabled={loading} onClick={confirmar}>
                                {loading ? 'Confirmando...' : 'Confirmar Reserva'}
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}

export default App;