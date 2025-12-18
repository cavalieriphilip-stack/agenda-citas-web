import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './App.css'; 
import {
    API_BASE_URL, getPacientes, getProfesionales, getHorariosByProfesional,
    getReservasDetalle, crearReserva, crearPaciente, cancelarReserva, reagendarReserva,
    updatePaciente, deletePaciente, getConfiguraciones, deleteConfiguracion,
    buscarPacientePorRut, updateProfesional, deleteProfesional
} from './api';

// --- DATA MAESTRA (Abreviada) ---
const TRATAMIENTOS = [
    { id: 1, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto online', valor: 20000, codigo: '1203001', descripcion: 'Evaluación completa.' },
    { id: 2, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto presencial', valor: 35000, codigo: '1203002', descripcion: 'Evaluación presencial.' },
    // ... (Tu data completa) ...
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

const validateRut = (rut) => {
    if (!rut) return false;
    const value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (value.length < 2) return false;
    const body = value.slice(0, -1);
    const dv = value.slice(-1);
    let suma = 0; let multiplo = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(body.charAt(i));
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    const dvEsperado = 11 - (suma % 11);
    let dvCalculado = '';
    if (dvEsperado === 11) dvCalculado = '0'; else if (dvEsperado === 10) dvCalculado = 'K'; else dvCalculado = dvEsperado.toString();
    return dvCalculado === dv;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// --- COMPONENTES UI ---
function MobileAccordion({ title, subtitle, children }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="mobile-card">
            <div className={`mobile-card-header ${isOpen?'open':''}`} onClick={() => setIsOpen(!isOpen)}>
                <div className="mobile-card-title">{title}{subtitle && <span className="mobile-card-subtitle">{subtitle}</span>}</div>
                <div className="mobile-card-icon">{isOpen ? '−' : '+'}</div>
            </div>
            {isOpen && <div className="mobile-card-body">{children}</div>}
        </div>
    );
}

function MultiSelectDropdown({ options, selectedValues, onChange, label }) {
    const [isOpen, setIsOpen] = useState(false); const wrapperRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
        document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    const toggleOption = (value) => { if (selectedValues.includes(value)) onChange(selectedValues.filter(v => v !== value)); else onChange([...selectedValues, value]); };
    return (
        <div className="dropdown-wrapper" ref={wrapperRef}>
            <label className="form-label">{label}</label>
            <div className="dropdown-header" onClick={() => setIsOpen(!isOpen)}><span>{selectedValues.length > 0 ? `${selectedValues.length} seleccionados` : 'Seleccionar...'}</span><span>{isOpen ? '▲' : '▼'}</span></div>
            {isOpen && <div className="dropdown-list">{options.map(opt => (<div key={opt} className="dropdown-item" onClick={() => toggleOption(opt)}><input type="checkbox" checked={selectedValues.includes(opt)} readOnly /><span>{opt}</span></div>))}</div>}
        </div>
    );
}

function Modal({ title, children, onClose }) {
    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                {title && <h2 style={{marginTop:0, marginBottom:20}}>{title}</h2>}
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
                <div className="brand-area"><button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button><img src={LOGO_URL} alt="Logo" className="cisd-logo-admin" /><span className="admin-title-text">CISD Admin</span></div>
                <div className="module-switcher"><button className={`module-tab ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => {setActiveModule('agenda'); setActiveView('resumen');}}>Gestión Clínica</button><button className={`module-tab ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => {setActiveModule('finanzas'); setActiveView('reporte');}}>Finanzas</button></div>
                <div className="nav-actions"><a href="/" className="btn-top-action">Web Paciente</a></div>
            </nav>
            <div className="workspace">
                {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>}
                <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">MENÚ {activeModule === 'agenda' ? 'AGENDA' : 'FINANZAS'}</div>
                    {activeModule === 'agenda' && ( <><div className={`nav-item ${activeView==='resumen'?'active':''}`} onClick={()=>handleNavClick('resumen')}>Resumen Agendamientos</div><div className={`nav-item ${activeView==='reservas'?'active':''}`} onClick={()=>handleNavClick('reservas')}>Nueva Reserva</div><div className={`nav-item ${activeView==='pacientes'?'active':''}`} onClick={()=>handleNavClick('pacientes')}>Administrar Pacientes</div><div className={`nav-item ${activeView==='profesionales'?'active':''}`} onClick={()=>handleNavClick('profesionales')}>Administrar Profesionales</div><div className={`nav-item ${activeView==='horarios'?'active':''}`} onClick={()=>handleNavClick('horarios')}>Administrar Horarios</div></> )}
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

// ------------------------------------------------------------------
// AGENDA RESUMEN (CALENDARIO FIXED)
// ------------------------------------------------------------------
function AgendaResumen({reservas, reload}){
    const [pros, setPros] = useState([]);
    const [filterPro, setFilterPro] = useState('');
    const [view, setView] = useState('week'); 
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null); 
    
    const [editId, setEditId] = useState(null);
    const [editProId, setEditProId] = useState('');
    const [editEspecialidad, setEditEspecialidad] = useState('');
    const [editTratamiento, setEditTratamiento] = useState('');
    const [editHorarioId, setEditHorarioId] = useState('');
    const [horariosDisponibles, setHorariosDisponibles] = useState([]);

    useEffect(()=>{ getProfesionales().then(setPros) },[]);

    const handleNav = (dir) => {
        const d = new Date(currentDate);
        if(view === 'day') d.setDate(d.getDate() + dir);
        if(view === 'week') d.setDate(d.getDate() + (dir*7));
        if(view === 'month') d.setMonth(d.getMonth() + dir);
        setCurrentDate(d);
    };

    const getDays = () => {
        const d = [], start = new Date(currentDate);
        if(view==='day'){ d.push(new Date(start)); }
        else if(view==='week'){ 
            const day = start.getDay(), diff = start.getDate() - day + (day===0?-6:1);
            const mon = new Date(start.setDate(diff));
            for(let i=0;i<7;i++){ const x = new Date(mon); x.setDate(mon.getDate()+i); d.push(x); }
        } else {
            const y = start.getFullYear(), m = start.getMonth();
            const first = new Date(y, m, 1);
            let sDay = first.getDay(); if(sDay===0) sDay=7; 
            const run = new Date(first); run.setDate(run.getDate() - (sDay - 1));
            for(let i=0;i<42;i++){ d.push(new Date(run)); run.setDate(run.getDate()+1); }
        }
        return d;
    };

    const days = getDays();
    const filtered = reservas.filter(r => filterPro ? r.profesionalId === parseInt(filterPro) : true);

    const handleEventClick = (r) => {
        const match = TRATAMIENTOS.find(t => r.motivo.includes(t.tratamiento));
        setSelectedEvent({ ...r, fullTrat: match });
        setEditId(null); 
    };

    const deleteReserva = async(id) => { if(confirm('¿Eliminar?')){await cancelarReserva(id);reload(); setSelectedEvent(null);} };

    const startEdit = async(r) => {
        setEditId(r.id);
        setEditProId(r.profesionalId.toString());
        const matchTratamiento = TRATAMIENTOS.find(t => r.motivo.includes(t.tratamiento));
        setEditEspecialidad(matchTratamiento ? matchTratamiento.especialidad : '');
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
        return (p && p.especialidad) ? p.especialidad.split(',') : [];
    };

    const getTratamientosFiltrados = () => {
        const p = pros.find(x => x.id === parseInt(editProId));
        if (!p || !editEspecialidad) return [];
        const teoricos = TRATAMIENTOS.filter(t => t.especialidad === editEspecialidad);
        const proTrats = p.tratamientos ? p.tratamientos.split(',') : [];
        return teoricos.filter(t => proTrats.includes(t.tratamiento));
    };

    const saveEdit = async () => {
        if(!editHorarioId) return alert('Selecciona hora');
        try{ 
            await reagendarReserva(selectedEvent.id, editHorarioId, editProId, editTratamiento); 
            alert('Modificado con éxito'); 
            setSelectedEvent(null); 
            setEditId(null); 
            reload(); 
        } catch(e){ alert('Error al modificar'); }
    };

    return (
        <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
            <div className="page-header"><div className="page-title"><h1>Calendario de Citas</h1></div></div>
            <div className="dashboard-controls">
                <div className="cal-filter-group">
                    <select className="form-control" style={{maxWidth:250}} value={filterPro} onChange={e=>setFilterPro(e.target.value)}>
                        <option value="">Todos los Profesionales</option>
                        {pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}
                    </select>
                    <div style={{display:'flex', gap:5}}>
                        <button className={`calendar-nav-btn ${view==='day'?'active':''}`} onClick={()=>setView('day')}>Día</button>
                        <button className={`calendar-nav-btn ${view==='week'?'active':''}`} onClick={()=>setView('week')}>Semana</button>
                        <button className={`calendar-nav-btn ${view==='month'?'active':''}`} onClick={()=>setView('month')}>Mes</button>
                    </div>
                </div>
                <div className="cal-nav-group" style={{display:'flex', alignItems:'center', gap:10}}>
                    <button className="calendar-nav-btn" onClick={()=>handleNav(-1)}>‹</button>
                    <span style={{fontWeight:'bold', textTransform:'capitalize'}}>
                        {view==='month' ? currentDate.toLocaleDateString('es-CL', {month:'long', year:'numeric'}) : `Semana del ${days[0]?.getDate()}`}
                    </span>
                    <button className="calendar-nav-btn" onClick={()=>handleNav(1)}>›</button>
                    <button className="calendar-nav-btn" onClick={()=>setCurrentDate(new Date())}>Hoy</button>
                </div>
            </div>

            <div className="calendar-grid-wrapper">
                {/* --- WRAPPER UNIFICADO PARA SCROLL MÓVIL --- */}
                <div className="calendar-scroll-container">
                    {(view==='day'||view==='week') ? (
                        <>
                            <div className="cal-header-row" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}>
                                <div className="cal-header-cell">Hora</div>
                                {days.map((d, i)=><div key={i} className={`cal-header-cell ${d.toDateString()===new Date().toDateString()?'today':''}`}>{d.toLocaleDateString('es-CL',{weekday:'short', day:'numeric'})}</div>)}
                            </div>
                            <div className="calendar-body" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}>
                                <div>{Array.from({length:13},(_,i)=>i+8).map(h=><div key={h} className="cal-time-label">{h}:00</div>)}</div>
                                {days.map((d, i)=>(
                                    <div key={i} className="cal-day-col">
                                        {filtered.filter(r=>{
                                            if(!r.fecha) return false;
                                            const rd=new Date(r.fecha); 
                                            return rd.getDate()===d.getDate() && rd.getMonth()===d.getMonth();
                                        }).map(r=>{
                                            const st = new Date(r.fecha), h=st.getHours(); if(h<8||h>20)return null;
                                            const top = ((h-8)*60)+st.getMinutes();
                                            return (
                                                <div key={r.id} className="cal-event evt-blue" style={{top: top, height: 45}} onClick={()=>handleEventClick(r)} title={r.pacienteNombre}>
                                                    <strong>{st.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</strong>
                                                    <span>{r.pacienteNombre}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="cal-header-row" style={{gridTemplateColumns: 'repeat(7, 1fr)'}}>{['L','M','X','J','V','S','D'].map(d=><div key={d} className="cal-header-cell">{d}</div>)}</div>
                            <div className="month-grid">
                                {days.map((d, i)=>(
                                    <div key={i} className="month-cell">
                                        <div className="month-cell-header">{d.getDate()}</div>
                                        {(() => {
                                            const dailyEvents = filtered.filter(r=>{
                                                if(!r.fecha) return false;
                                                const rd=new Date(r.fecha); return rd.getDate()===d.getDate() && rd.getMonth()===d.getMonth();
                                            });
                                            const constToShow = dailyEvents.slice(0, 3);
                                            const rest = dailyEvents.length - 3;
                                            return (
                                                <>
                                                    {constToShow.map(r => (
                                                        <div key={r.id} className="month-dot" onClick={()=>handleEventClick(r)}>{new Date(r.fecha).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})} {r.pacienteNombre}</div>
                                                    ))}
                                                    {rest > 0 && <div className="month-more">+{rest} más</div>}
                                                </>
                                            )
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL DETALLE / EDICIÓN */}
            {selectedEvent && (
                <Modal onClose={()=>setSelectedEvent(null)}>
                    {editId === selectedEvent.id ? (
                        <div style={{padding:10}}>
                            <h2 style={{marginTop:0}}>Modificar Cita</h2>
                            <div className="input-row">
                                <div><label className="form-label">Profesional</label><select className="form-control" value={editProId} onChange={e=>handleProChange(e.target.value)}>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select></div>
                                <div><label className="form-label">Especialidad</label><select className="form-control" value={editEspecialidad} onChange={e=>setEditEspecialidad(e.target.value)} disabled={!editProId}><option value="">Seleccionar...</option>{getEspecialidadesPro().map(e=><option key={e} value={e}>{e}</option>)}</select></div>
                            </div>
                            <div className="input-row">
                                <div><label className="form-label">Tratamiento</label><select className="form-control" value={editTratamiento} onChange={e=>setEditTratamiento(e.target.value)} disabled={!editEspecialidad}><option value="">Seleccionar...</option>{getTratamientosFiltrados().map(t=><option key={t.id} value={t.tratamiento}>{t.tratamiento}</option>)}</select></div>
                                <div><label className="form-label">Nuevo Horario</label><select className="form-control" value={editHorarioId} onChange={e=>setEditHorarioId(e.target.value)} disabled={!editTratamiento}><option value="">Selecciona hora...</option>{horariosDisponibles.map(h=><option key={h.id} value={h.id}>{fmtDate(h.fecha)}</option>)}</select></div>
                            </div>
                            <div className="detail-actions">
                                <button className="btn-primary" onClick={saveEdit}>Guardar Cambios</button>
                                <button className="btn-edit" onClick={()=>setEditId(null)}>Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="detail-popup-header">
                                <div>
                                    <h2 className="detail-popup-title">Detalle de la Cita</h2>
                                    <p className="detail-popup-subtitle">ID Reserva: #{selectedEvent.id}</p>
                                </div>
                            </div>
                            <div className="detail-row"><span className="detail-label">Paciente:</span><span className="detail-value">{selectedEvent.pacienteNombre}</span></div>
                            <div className="detail-row"><span className="detail-label">Profesional:</span><span className="detail-value">{selectedEvent.profesionalNombre}</span></div>
                            <div className="detail-row"><span className="detail-label">Fecha:</span><span className="detail-value">{new Date(selectedEvent.fecha).toLocaleDateString('es-CL')}</span></div>
                            <div className="detail-row"><span className="detail-label">Hora:</span><span className="detail-value">{new Date(selectedEvent.fecha).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</span></div>
                            <div className="detail-row"><span className="detail-label">Tratamiento:</span><span className="detail-value">{selectedEvent.motivo}</span></div>
                            <div className="detail-row"><span className="detail-label">Valor:</span><span className="detail-value">{fmtMoney(selectedEvent.fullTrat?.valor || 0)}</span></div>
                            
                            <div className="detail-actions">
                                <button className="btn-primary" onClick={()=>startEdit(selectedEvent)}>Modificar</button>
                                <button className="btn-edit" onClick={()=>setSelectedEvent(null)}>Cerrar</button>
                                <button className="btn-danger" onClick={()=>deleteReserva(selectedEvent.id)}>Eliminar</button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </div>
    )
}

// [MODIFICADO] REPORTE FINANCIERO CON TABLA MÓVIL OPTIMIZADA
function FinanzasReporte({total,count,reservas}){ 
    const statsPro = reservas.reduce((acc, curr) => { acc[curr.profesionalNombre] = (acc[curr.profesionalNombre] || 0) + 1; return acc; }, {});
    const statsTrat = reservas.reduce((acc, curr) => { acc[curr.motivo] = (acc[curr.motivo] || 0) + 1; return acc; }, {});

    return ( 
        <div>
            <div className="page-header"><div className="page-title"><h1>Reporte Financiero</h1></div></div>
            <div className="kpi-grid">
                <div className="kpi-box"><div className="kpi-label">Ingresos</div><div className="kpi-value">{fmtMoney(total)}</div></div>
                <div className="kpi-box"><div className="kpi-label">Citas</div><div className="kpi-value">{count}</div></div>
            </div>

            <div className="input-row finance-section">
                <div className="pro-card">
                    <h3>Atenciones por Profesional</h3>
                    <div className="data-table-container desktop-view-only">
                        <table className="finance-table"><thead><tr><th>Profesional</th><th>Citas</th></tr></thead><tbody>{Object.entries(statsPro).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
                    </div>
                    <div className="mobile-view-only">
                        {Object.entries(statsPro).map(([k,v]) => (
                            <div key={k} style={{display:'flex',justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee'}}><span>{k}</span><strong>{v}</strong></div>
                        ))}
                    </div>
                </div>
                
                <div className="pro-card">
                    <h3>Agendas por Tratamiento</h3>
                    <div className="data-table-container desktop-view-only">
                        <table className="finance-table"><thead><tr><th>Tratamiento</th><th>Cantidad</th></tr></thead><tbody>{Object.entries(statsTrat).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
                    </div>
                    <div className="mobile-view-only">
                        {Object.entries(statsTrat).map(([k,v]) => (
                            <div key={k} style={{display:'flex',justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee'}}><span>{k}</span><strong>{v}</strong></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* TABLA DETALLADA DE TRANSACCIONES */}
            <div className="pro-card" style={{marginTop: 30}}>
                <h3>Resumen Financiero por Cliente</h3>
                <div className="data-table-container desktop-view-only">
                    <table className="data-table">
                        <thead><tr><th>Fecha</th><th>Paciente</th><th>Tratamiento</th><th>Valor</th></tr></thead>
                        <tbody>
                            {reservas.map(r => {
                                const match = TRATAMIENTOS.find(t => r.motivo.includes(t.tratamiento));
                                return (
                                    <tr key={r.id}>
                                        <td>{new Date(r.fecha).toLocaleDateString()}</td>
                                        <td>{r.pacienteNombre}</td>
                                        <td>{r.motivo}</td>
                                        <td>{fmtMoney(match ? match.valor : 0)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* MÓVIL */}
                <div className="mobile-view-only">
                    {reservas.map(r => {
                        const match = TRATAMIENTOS.find(t => r.motivo.includes(t.tratamiento));
                        return (
                            <MobileAccordion key={r.id} title={r.pacienteNombre} subtitle={new Date(r.fecha).toLocaleDateString()}>
                                <div className="mobile-data-row"><span className="mobile-label">Tratamiento</span><span>{r.motivo}</span></div>
                                <div className="mobile-data-row"><span className="mobile-label">Valor</span><span>{fmtMoney(match ? match.valor : 0)}</span></div>
                            </MobileAccordion>
                        );
                    })}
                </div>
            </div>
        </div> 
    ) 
}

// ... (Resto de los componentes WebPaciente, etc.) ...
function WebPaciente() {
    // ... Mismo código anterior para WebPaciente ...
    // Asegúrate de incluir el componente WebPaciente al final, es idéntico al anterior.
    // Por brevedad, asumo que mantienes el WebPaciente de la respuesta anterior si no se modificó.
    // PERO PARA EVITAR ERRORES, PEGA TODO EL WEB PACIENTE AQUI:
    const [step, setStep] = useState(0); 
    const [profesionales, setProfesionales] = useState([]);
    const [form, setForm] = useState({ rut:'', nombre:'', email:'', telefono:'', especialidad:'', tratamientoId:'', profesionalId:'', horarioId:'' });
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [pacienteId, setPacienteId] = useState(null);
    const [multiAgenda, setMultiAgenda] = useState({}); 
    const [selectedDateKey, setSelectedDateKey] = useState(null); 
    const [availableDates, setAvailableDates] = useState([]); 

    useEffect(()=>{ getProfesionales().then(setProfesionales) },[]);

    const especialidades = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const prestaciones = TRATAMIENTOS.filter(t => t.especialidad === form.especialidad);
    const tratamientoSel = TRATAMIENTOS.find(t => t.id === parseInt(form.tratamientoId));
    
    const handleRutSearch = async () => {
        if(!form.rut) return alert("Ingrese su RUT");
        if(!validateRut(form.rut)) return alert("RUT inválido");
        setLoading(true);
        try {
            const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); 
            const paciente = await buscarPacientePorRut(rutLimpio);
            if (paciente) { setPacienteId(paciente.id); setForm(prev => ({...prev, nombre: paciente.nombreCompleto, email: paciente.email, telefono: paciente.telefono})); setStep(2); } else { setStep(1); }
        } catch(e) { setStep(1); } setLoading(false);
    };

    const handleTreatmentConfirm = async () => {
        setLoading(true);
        const prosAptos = profesionales.filter(p => p.tratamientos && p.tratamientos.includes(tratamientoSel.tratamiento));
        if (prosAptos.length === 0) { alert("No hay profesionales."); setLoading(false); return; }
        const promises = prosAptos.map(async p => { const horarios = await getHorariosByProfesional(p.id); return { profesional: p, slots: Array.isArray(horarios) ? horarios.filter(x => new Date(x.fecha) > new Date()) : [] }; });
        const results = await Promise.all(promises);
        const agendaMap = {}; const datesSet = new Set();
        results.forEach(({profesional, slots}) => { slots.forEach(slot => { const dateKey = toDateKey(slot.fecha); datesSet.add(dateKey); if (!agendaMap[dateKey]) agendaMap[dateKey] = []; let proEntry = agendaMap[dateKey].find(entry => entry.profesional.id === profesional.id); if (!proEntry) { proEntry = { profesional, slots: [] }; agendaMap[dateKey].push(proEntry); } proEntry.slots.push(slot); }); });
        const sortedDates = Array.from(datesSet).sort();
        setMultiAgenda(agendaMap); setAvailableDates(sortedDates);
        if (sortedDates.length > 0) setSelectedDateKey(sortedDates[0]);
        setLoading(false); setStep(3); 
    };

    const selectSlot = (pid, hid) => { setForm(prev => ({ ...prev, profesionalId: pid, horarioId: hid })); setStep(4); };

    const confirmar = async () => {
        setLoading(true);
        try {
            let pid = pacienteId;
            if (!pid) { const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); const pac = await crearPaciente({nombreCompleto:form.nombre, email:form.email, telefono:form.telefono, rut: rutLimpio}); pid = pac.id; }
            await crearReserva({ pacienteId: pid, profesionalId: form.profesionalId, horarioDisponibleId: form.horarioId, motivo: `${tratamientoSel.tratamiento}` });
            setBookingSuccess(true);
        } catch(e) { alert('Error al reservar.'); } setLoading(false);
    }

    const goBack = () => { if(step===0)return; if(step===2 && pacienteId) setStep(0); else setStep(step-1); };

    const ReservaDetalleCard = ({ title, showTotal }) => {
        const slotDate = new Date(form.horarioId || new Date());
        const fechaStr = slotDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const horaStr = slotDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        let proName = "Asignado";
        if (multiAgenda[selectedDateKey]) { const foundEntry = multiAgenda[selectedDateKey].find(e => e.profesional.id === form.profesionalId); if (foundEntry) proName = foundEntry.profesional.nombreCompleto; }
        return ( <div className="conf-card"><div className="conf-section"><div className="conf-title">Paciente</div><div className="conf-row"><span className="conf-label">Nombre</span><span className="conf-value">{form.nombre}</span></div><div className="conf-row"><span className="conf-label">RUT</span><span className="conf-value">{form.rut}</span></div></div><div className="conf-section"><div className="conf-title">Servicio</div><div className="conf-row"><span className="conf-label">Tratamiento</span><span className="conf-value">{tratamientoSel?.tratamiento}</span></div></div><div className="conf-section"><div className="conf-title">Cita</div><div className="conf-row"><span className="conf-label">Profesional</span><span className="conf-value">{proName}</span></div><div className="conf-row"><span className="conf-label">Fecha</span><span className="conf-value">{fechaStr}</span></div><div className="conf-row"><span className="conf-label">Hora</span><span className="conf-value">{horaStr}</span></div></div>{showTotal && <div className="conf-section" style={{background:'#fafafa'}}><div className="conf-total"><span className="conf-total-label">Total a Pagar</span><span className="conf-total-value">{fmtMoney(tratamientoSel?.valor || 0)}</span></div></div>}</div> );
    };

    if(bookingSuccess) {
        return ( <div className="web-shell"><div className="web-content success-card"><span className="success-icon-big">✓</span><h1 className="web-title">¡Reserva Exitosa!</h1><p className="web-subtitle">Enviado a<br/><strong>{form.email}</strong></p><ReservaDetalleCard title="Comprobante" showTotal={true} /><button className="btn-block-action" onClick={()=>window.location.reload()}>Volver al Inicio</button></div></div> )
    }

    return (
        <div className="web-shell">
            <header className="web-header">{step > 0 && <button className="web-back-btn" onClick={goBack}>‹</button>}<img src={LOGO_URL} alt="Logo" className="cisd-logo-web" /></header>
            <div className="stepper-container"><div className="stepper"><div className={`step-dot ${step >= 0 ? 'active' : ''}`}></div><div className={`step-line ${step >= 1 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div><div className={`step-line ${step >= 2 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div><div className={`step-line ${step >= 3 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div></div></div>
            <div className="web-content">
                {step === 0 && ( <> <div><h2 className="web-title">Bienvenido</h2><p className="web-subtitle">Agenda tu hora médica.</p></div><div className="input-group"><label className="web-label">RUT</label><input className="web-input" placeholder="Ej: 12.345.678-9" value={form.rut} onChange={e=>setForm({...form, rut: formatRut(e.target.value)})} maxLength={12} autoFocus /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.rut || loading} onClick={handleRutSearch}>{loading ? 'Cargando...' : 'Comenzar'}</button></div> </> )}
                {step === 1 && ( <> <h2 className="web-title">Datos Personales</h2><div className="input-group"><label className="web-label">Nombre</label><input className="web-input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} /></div><div className="input-group"><label className="web-label">Email</label><input className="web-input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} /></div><div className="input-group"><label className="web-label">Teléfono</label><input className="web-input" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.nombre || !validateEmail(form.email)} onClick={()=>setStep(2)}>Guardar Datos</button></div> </> )}
                {step === 2 && ( <> <h2 className="web-title">¿Qué necesitas?</h2><div className="input-group"><label className="web-label">Especialidad</label><select className="web-select" value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value, tratamientoId:''})}><option value="">Selecciona...</option>{especialidades.map(e=><option key={e} value={e}>{e}</option>)}</select></div><div className="input-group"><label className="web-label">Tratamiento</label><select className="web-select" disabled={!form.especialidad} value={form.tratamientoId} onChange={e=>setForm({...form, tratamientoId:e.target.value})}><option value="">Selecciona...</option>{prestaciones.map(p=><option key={p.id} value={p.id}>{p.tratamiento}</option>)}</select></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.tratamientoId || loading} onClick={handleTreatmentConfirm}>{loading ? 'Buscando...' : 'Buscar Horas'}</button></div> </> )}
                {step === 3 && ( <> <h2 className="web-title">Elige tu Hora</h2><div className="rs-date-tabs">{availableDates.map(dateStr => { const dateObj = new Date(dateStr + 'T00:00:00'); return ( <div key={dateStr} className={`rs-date-tab ${selectedDateKey === dateStr ? 'selected' : ''}`} onClick={() => setSelectedDateKey(dateStr)}><div className="rs-day-name">{dateObj.toLocaleDateString('es-CL', {weekday: 'short'})}</div><div className="rs-day-number">{dateObj.getDate()}</div></div> ); })}</div><div className="rs-pro-list">{multiAgenda[selectedDateKey]?.map((entry) => ( <div key={entry.profesional.id} className="rs-pro-card"><div className="rs-pro-header"><div className="rs-avatar-circle">{entry.profesional.nombreCompleto.charAt(0)}</div><div className="rs-pro-details"><strong>{entry.profesional.nombreCompleto}</strong><span>{entry.profesional.especialidad}</span></div></div><div className="rs-slots-grid">{entry.slots.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(slot => ( <button key={slot.id} className="rs-slot-btn" onClick={() => selectSlot(entry.profesional.id, slot.id)}>{new Date(slot.fecha).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</button> ))}</div></div> ))}</div> </> )}
                {step === 4 && ( <> <h2 className="web-title">Confirmar Reserva</h2><ReservaDetalleCard title="Resumen" showTotal={true} /><div className="bottom-bar"><button className="btn-block-action" disabled={loading} onClick={confirmar}>{loading ? 'Confirmando...' : 'Confirmar Reserva'}</button></div> </> )}
            </div>
        </div>
    );
}

export default App;