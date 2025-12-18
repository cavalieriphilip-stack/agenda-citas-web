import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './App.css'; 
import {
    API_BASE_URL, getPacientes, getProfesionales, getHorariosByProfesional,
    getReservasDetalle, crearReserva, crearPaciente, cancelarReserva, reagendarReserva,
    updatePaciente, deletePaciente, getConfiguraciones, deleteConfiguracion,
    buscarPacientePorRut, updateProfesional, deleteProfesional
} from './api';

// --- DATA MAESTRA (Abreviada para el ejemplo, usa la tuya completa) ---
const TRATAMIENTOS = [
    { id: 1, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto online', valor: 20000, codigo: '1203001', descripcion: 'Evaluación completa.' },
    // ... (Tu lista completa de tratamientos va aquí) ...
    { id: 19, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Online', valor: 25000, codigo: '1204001', descripcion: 'Evaluación inicial.' },
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
// [NUEVO] AGENDA RESUMEN CON CALENDARIO INTERACTIVO Y FILTROS
// ------------------------------------------------------------------
function AgendaResumen({reservas, reload}){
    const [pros, setPros] = useState([]);
    const [filterPro, setFilterPro] = useState(''); // '' = Todos
    const [view, setView] = useState('week'); // 'day', 'week', 'month'
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Para modal de detalles
    const [selectedReserva, setSelectedReserva] = useState(null);

    useEffect(()=>{ getProfesionales().then(setPros) },[]);

    // Navegación
    const handleNav = (direction) => {
        const newDate = new Date(currentDate);
        if(view === 'day') newDate.setDate(currentDate.getDate() + direction);
        if(view === 'week') newDate.setDate(currentDate.getDate() + (direction * 7));
        if(view === 'month') newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    // Generar días para vista
    const getDaysToRender = () => {
        const days = [];
        const start = new Date(currentDate);
        
        if (view === 'day') {
            days.push(new Date(start));
        } else if (view === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Lunes
            const monday = new Date(start.setDate(diff));
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push(d);
            }
        } else if (view === 'month') {
            // Lógica mes: 1er día del mes + padding
            const year = start.getFullYear();
            const month = start.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Padding inicial (Lunes=1)
            let startDay = firstDay.getDay(); 
            if (startDay === 0) startDay = 7; // Domingo al final
            
            // Llenar previos
            const runner = new Date(firstDay);
            runner.setDate(runner.getDate() - (startDay - 1));
            
            // 6 semanas para cubrir mes completo visualmente (42 celdas)
            for(let i=0; i<42; i++) {
                days.push(new Date(runner));
                runner.setDate(runner.getDate() + 1);
            }
        }
        return days;
    };

    const days = getDaysToRender();
    
    // Filtrar Reservas para la vista
    const filteredReservas = reservas.filter(r => {
        if (filterPro && r.profesionalId !== parseInt(filterPro)) return false;
        // Solo mostrar confirmadas o activas (opcional)
        return true; 
    });

    return (
        <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
            <div className="page-header"><div className="page-title"><h1>Calendario de Citas</h1></div></div>
            
            {/* CONTROLES SUPERIORES */}
            <div className="dashboard-controls">
                <div className="cal-filter-group">
                    <select className="form-control" style={{maxWidth:250}} value={filterPro} onChange={e=>setFilterPro(e.target.value)}>
                        <option value="">Todos los Profesionales</option>
                        {pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}
                    </select>
                    <div className="cal-view-switcher">
                        <button className={`cal-view-btn ${view==='day'?'active':''}`} onClick={()=>setView('day')}>Día</button>
                        <button className={`cal-view-btn ${view==='week'?'active':''}`} onClick={()=>setView('week')}>Semana</button>
                        <button className={`cal-view-btn ${view==='month'?'active':''}`} onClick={()=>setView('month')}>Mes</button>
                    </div>
                </div>
                
                <div className="cal-nav-group">
                    <button className="btn-edit" onClick={()=>handleNav(-1)}>‹</button>
                    <span className="cal-nav-title">
                        {view === 'month' 
                            ? currentDate.toLocaleDateString('es-CL', {month:'long', year:'numeric'}).toUpperCase()
                            : days[0] ? `Semana del ${days[0].getDate()}` : ''
                        }
                    </span>
                    <button className="btn-edit" onClick={()=>handleNav(1)}>›</button>
                    <button className="btn-edit" onClick={()=>setCurrentDate(new Date())}>Hoy</button>
                </div>
            </div>

            {/* GRILLA CALENDARIO */}
            <div className="calendar-grid-wrapper">
                
                {/* VISTA DÍA / SEMANA */}
                {(view === 'day' || view === 'week') && (
                    <>
                        <div className="cal-header-row" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}>
                            <div className="cal-header-cell">Hora</div>
                            {days.map(d => (
                                <div key={d.toISOString()} className={`cal-header-cell ${d.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                    {d.toLocaleDateString('es-CL', {weekday:'short', day:'numeric'})}
                                </div>
                            ))}
                        </div>
                        <div className="calendar-grid-time" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}>
                            {/* Columna Horas */}
                            <div>
                                {Array.from({length: 13}, (_, i) => i + 8).map(h => (
                                    <div key={h} className="cal-time-label">{h}:00</div>
                                ))}
                            </div>
                            {/* Columnas Días */}
                            {days.map(d => (
                                <div key={d.toISOString()} className="cal-day-col">
                                    {filteredReservas.filter(r => {
                                        const rDate = new Date(r.fecha);
                                        return rDate.getDate() === d.getDate() && rDate.getMonth() === d.getMonth();
                                    }).map(r => {
                                        const start = new Date(r.fecha);
                                        const hour = start.getHours();
                                        if (hour < 8 || hour > 20) return null; // Fuera de rango visual
                                        const top = ((hour - 8) * 60) + start.getMinutes();
                                        const height = 45; // Asumimos 45 min o calcular
                                        
                                        return (
                                            <div 
                                                key={r.id} 
                                                className="cal-event evt-blue"
                                                style={{top: `${top}px`, height: `${height}px`}}
                                                onClick={()=>alert(`Paciente: ${r.pacienteNombre}\nTratamiento: ${r.motivo}`)}
                                                title={`${r.pacienteNombre} - ${r.motivo}`}
                                            >
                                                <strong>{start.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</strong>
                                                <span>{r.pacienteNombre}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* VISTA MES */}
                {view === 'month' && (
                    <>
                        <div className="cal-header-row" style={{gridTemplateColumns: 'repeat(7, 1fr)'}}>
                            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day => <div key={day} className="cal-header-cell">{day}</div>)}
                        </div>
                        <div className="calendar-grid-month">
                            {days.map(d => {
                                const isToday = d.toDateString() === new Date().toDateString();
                                const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                                const dayEvents = filteredReservas.filter(r => {
                                    const rDate = new Date(r.fecha);
                                    return rDate.getDate() === d.getDate() && rDate.getMonth() === d.getMonth();
                                });

                                return (
                                    <div key={d.toISOString()} className={`month-cell ${isToday ? 'today' : ''}`} style={{opacity: isCurrentMonth ? 1 : 0.4}}>
                                        <div className="month-cell-header">{d.getDate()}</div>
                                        <div style={{overflowY:'auto', maxHeight:70}}>
                                            {dayEvents.map(r => (
                                                <div key={r.id} className="month-event-dot" title={r.pacienteNombre}>
                                                    {new Date(r.fecha).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})} {r.pacienteNombre.split(' ')[0]}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function AgendaNuevaReserva({ reload, reservas }) {
    // ... (Misma lógica anterior) ...
    // Se mantiene igual para ahorrar espacio, copia la versión anterior si la necesitas
    // OJO: Por completitud, te dejo el código base, asegúrate de tenerlo.
    const [pacientes, setPacientes] = useState([]);
    const [pros, setPros] = useState([]);
    const [horarios, setHorarios] = useState([]);
    const [form, setForm] = useState({ pacienteId: '', profesionalId: '', horarioId: '', motivo: '', especialidad: '', tratamientoId: '' });
    useEffect(() => { getPacientes().then(setPacientes); getProfesionales().then(setPros); }, []);
    const especialidades = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const prestaciones = TRATAMIENTOS.filter(t => t.especialidad === form.especialidad);
    const prosFiltrados = form.tratamientoId ? pros.filter(p => { const trat = TRATAMIENTOS.find(x => x.id === parseInt(form.tratamientoId)); return trat && p.tratamientos && p.tratamientos.includes(trat.tratamiento); }) : [];
    const handlePro = async (pid) => { setForm({ ...form, profesionalId: pid }); setHorarios([]); if (!pid) return; try { const h = await getHorariosByProfesional(pid); if (Array.isArray(h)) setHorarios(h); } catch(e) { setHorarios([]); } }
    const save = async (e) => { e.preventDefault(); if (!form.tratamientoId) return alert("Tratamiento obligatorio"); const trat = TRATAMIENTOS.find(t => t.id === parseInt(form.tratamientoId)); try { await crearReserva({ pacienteId: parseInt(form.pacienteId), profesionalId: parseInt(form.profesionalId), horarioDisponibleId: form.horarioId, motivo: trat.tratamiento }); alert('Creada'); reload(); } catch (e) { alert('Error'); } };
    
    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Nueva Reserva Manual</h1></div></div>
            <div className="pro-card">
                <form onSubmit={save}>
                    <div className="input-row"><div><label className="form-label">Especialidad</label><select className="form-control" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value, tratamientoId: '' })}><option value="">Seleccionar...</option>{especialidades.map(e => <option key={e} value={e}>{e}</option>)}</select></div><div><label className="form-label">Tratamiento</label><select className="form-control" disabled={!form.especialidad} onChange={e => setForm({ ...form, tratamientoId: e.target.value })}><option value="">Seleccionar...</option>{prestaciones.map(t => <option key={t.id} value={t.id}>{t.tratamiento}</option>)}</select></div></div>
                    <div className="input-row"><div><label className="form-label">Paciente</label><select className="form-control" onChange={e => setForm({ ...form, pacienteId: e.target.value })}><option value="">Seleccionar...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto} ({formatRut(p.rut)})</option>)}</select></div><div><label className="form-label">Profesional</label><select className="form-control" disabled={!form.tratamientoId} onChange={e => handlePro(e.target.value)}><option value="">Seleccionar...</option>{prosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select></div></div>
                    <div style={{ marginBottom: 20 }}><label className="form-label">Horario</label><select className="form-control" onChange={e => setForm({ ...form, horarioId: e.target.value })}><option value="">Seleccionar...</option>{Array.isArray(horarios) && horarios.map(h => <option key={h.id} value={h.id}>{fmtDate(h.fecha)}</option>)}</select></div>
                    <button className="btn-primary">Crear Reserva</button>
                </form>
            </div>
            <h3 style={{ marginTop: 40 }}>Reservas Recientes</h3>
            <div className="pro-card" style={{ padding: 0 }}>
                <div className="data-table-container desktop-view-only"><table className="data-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Profesional</th></tr></thead><tbody>{reservas.slice(0, 5).map(r => (<tr key={r.id}><td>{fmtDate(r.fecha)}</td><td>{r.pacienteNombre}</td><td>{r.profesionalNombre}</td></tr>))}</tbody></table></div>
                <div className="mobile-view-only" style={{padding:15}}>{reservas.slice(0, 5).map(r => (<div key={r.id} style={{borderBottom:'1px solid #eee', padding:'10px 0'}}><div style={{fontWeight:'bold'}}>{fmtDate(r.fecha)}</div><div style={{fontSize:'0.9rem'}}>{r.pacienteNombre}</div><div style={{fontSize:'0.8rem', color:'#666'}}>{r.profesionalNombre}</div></div>))}</div>
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
        if (!validateRut(form.rut)) { alert("RUT inválido"); return; }
        if (!validateEmail(form.email)) { alert("Email inválido"); return; }
        try { if(editingId) { await updatePaciente(editingId, form); alert('Actualizado'); setEditingId(null); } else { await crearPaciente(form); alert('Creado'); } setForm({nombreCompleto:'',email:'',telefono:'', rut:''}); load(); } catch(e) { alert("Error"); }
    };
    const handleEdit = (p) => { setForm({ nombreCompleto: p.nombreCompleto, email: p.email, telefono: p.telefono, rut: formatRut(p.rut||'') }); setEditingId(p.id); window.scrollTo(0, 0); };
    const handleDelete = async (id) => { if(confirm('¿Seguro?')) { await deletePaciente(id); load(); } };

    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Pacientes</h1></div></div>
            <div className="pro-card">
                <h3 style={{marginTop:0}}>{editingId ? 'Editar' : 'Nuevo'}</h3>
                <form onSubmit={save}>
                    <div className="input-row"><div><label className="form-label">RUT</label><input className="form-control" value={form.rut} onChange={handleRutChange} /></div><div><label className="form-label">Nombre</label><input className="form-control" value={form.nombreCompleto} onChange={e=>setForm({...form,nombreCompleto:e.target.value})}/></div></div>
                    <div className="input-row"><div><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><label className="form-label">Teléfono</label><input className="form-control" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></div></div>
                    <button className="btn-primary">Guardar</button>
                </form>
            </div>
            <div className="pro-card">
                <div className="data-table-container desktop-view-only"><table className="data-table"><thead><tr><th>RUT</th><th>Nombre</th><th>Email</th><th>Acciones</th></tr></thead><tbody>{pacientes.map(p=>(<tr key={p.id}><td>{formatRut(p.rut)}</td><td>{p.nombreCompleto}</td><td>{p.email}</td><td><button className="btn-edit" onClick={()=>handleEdit(p)}>Editar</button><button className="btn-danger" onClick={()=>handleDelete(p.id)}>Borrar</button></td></tr>))}</tbody></table></div>
                <div className="mobile-view-only">{pacientes.map(p => (<MobileAccordion key={p.id} title={p.nombreCompleto}><div className="mobile-data-row"><span className="mobile-label">RUT</span><span>{formatRut(p.rut)}</span></div><div className="mobile-data-row"><span className="mobile-label">Email</span><span>{p.email}</span></div><div style={{marginTop:10}}><button className="btn-edit" onClick={()=>handleEdit(p)}>Editar</button></div></MobileAccordion>))}</div>
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
    const handleEdit = (p) => { setForm({ id: p.id, nombreCompleto: p.nombreCompleto, especialidades: p.especialidad ? p.especialidad.split(',') : [], tratamientos: p.tratamientos ? p.tratamientos.split(',') : [] }); setIsEditing(true); window.scrollTo(0,0); };
    const save = async (e) => { e.preventDefault(); if (form.especialidades.length === 0) return alert("Selecciona especialidad"); const payload = { nombreCompleto: form.nombreCompleto, especialidad: form.especialidades.join(','), tratamientos: form.tratamientos.join(',') }; try { if (isEditing) await updateProfesional(form.id, payload); else await fetch(`${API_BASE_URL}/profesionales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); alert('Guardado'); setIsEditing(false); setForm({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] }); load(); } catch (e) { alert("Error"); } }
    const handleDelete = async (id) => { if(confirm('¿Eliminar?')) { await deleteProfesional(id); load(); } };

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Profesionales</h1></div></div>
            <div className="pro-card">
                <h3 style={{marginTop:0}}>{isEditing ? 'Editar' : 'Nuevo'}</h3>
                <form onSubmit={save}>
                    <div className="input-row"><div style={{width:'100%'}}><label className="form-label">Nombre</label><input className="form-control" value={form.nombreCompleto} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} /></div></div>
                    <div className="input-row"><div><MultiSelectDropdown label="Especialidades" options={especialidadesUnicas} selectedValues={form.especialidades} onChange={handleSpecChange} /></div><div><MultiSelectDropdown label="Tratamientos" options={tratamientosDisponibles} selectedValues={form.tratamientos} onChange={handleTratChange} /></div></div>
                    <button className="btn-primary">Guardar</button>
                </form>
            </div>
            <div className="pro-card">
                <div className="data-table-container desktop-view-only"><table className="data-table"><thead><tr><th>Nombre</th><th>Especialidades</th><th>Acciones</th></tr></thead><tbody>{pros.map(p => (<tr key={p.id}><td><strong>{p.nombreCompleto}</strong></td><td>{p.especialidad}</td><td><button className="btn-edit" onClick={() => handleEdit(p)}>Editar</button><button className="btn-danger" onClick={() => handleDelete(p.id)}>X</button></td></tr>))}</tbody></table></div>
                <div className="mobile-view-only">{pros.map(p => (<MobileAccordion key={p.id} title={p.nombreCompleto}><div className="mobile-data-row"><span className="mobile-label">Especialidades</span><span>{p.especialidad}</span></div><div style={{marginTop:10}}><button className="btn-edit" onClick={() => handleEdit(p)}>Editar</button></div></MobileAccordion>))}</div>
            </div>
        </div>
    )
}

function AgendaHorarios(){
    const [pros,setPros]=useState([]);
    const [configs, setConfigs] = useState([]);
    const [fechaSel, setFechaSel] = useState('');
    const [form,setForm]=useState({profesionalId:'',diaSemana:'',horaInicio:'09:00',horaFin:'18:00', duracionSlot: 30, intervalo: 0});
    
    // NOTA: El calendario visual se movió a AgendaResumen, aquí solo configuramos bloques
    useEffect(()=>{ getProfesionales().then(setPros); loadConfigs(); },[]);
    const loadConfigs = async () => { try { const data = await getConfiguraciones(); setConfigs(Array.isArray(data) ? data : []); } catch (e) { setConfigs([]); } };
    const save=async(e)=>{ e.preventDefault(); const payload = { ...form, fecha: fechaSel }; await fetch(`${API_BASE_URL}/configuracion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); alert(`Guardado`); await loadConfigs(); };
    const borrarConfig = async (id) => { if(confirm("¿Eliminar?")) { await deleteConfiguracion(id); loadConfigs(); } }
    
    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Configuración de Horarios</h1></div></div>
            <div className="pro-card">
                <form onSubmit={save}>
                    <div className="input-row"><div><label className="form-label">Profesional</label><select className="form-control" onChange={e=>setForm({...form,profesionalId:e.target.value})}><option>Seleccionar...</option>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select></div><div><label className="form-label">Fecha</label><input type="date" className="form-control" onChange={e=>setFechaSel(e.target.value)} /></div></div>
                    <div className="input-row"><div><label className="form-label">Inicio</label><input type="time" className="form-control" value={form.horaInicio} onChange={e=>setForm({...form,horaInicio:e.target.value})}/></div><div><label className="form-label">Fin</label><input type="time" className="form-control" value={form.horaFin} onChange={e=>setForm({...form,horaFin:e.target.value})}/></div></div>
                    <div className="input-row"><div><label className="form-label">Duración (Min)</label><select className="form-control" value={form.duracionSlot} onChange={e=>setForm({...form, duracionSlot: e.target.value})}><option value="15">15 Min</option><option value="30">30 Min</option><option value="45">45 Min</option><option value="60">60 Min</option></select></div><div><label className="form-label">Descanso (Min)</label><input type="number" className="form-control" value={form.intervalo} onChange={e=>setForm({...form, intervalo: e.target.value})} /></div></div>
                    <button className="btn-primary">Guardar Disponibilidad</button>
                </form>
            </div>
            <div className="pro-card">
                <h3>Bloques Configurados</h3>
                <div className="data-table-container desktop-view-only"><table className="data-table"><thead><tr><th>Profesional</th><th>Fecha</th><th>Horario</th><th>Acción</th></tr></thead><tbody>{configs.map(c=>(<tr key={c.id}><td>{c.profesional?.nombreCompleto}</td><td>{c.fecha}</td><td>{c.horaInicio} - {c.horaFin}</td><td><button className="btn-danger" onClick={()=>borrarConfig(c.id)}>Eliminar</button></td></tr>))}</tbody></table></div>
                <div className="mobile-view-only">{configs.map(c => (<MobileAccordion key={c.id} title={c.profesional?.nombreCompleto} subtitle={c.fecha}><div className="mobile-data-row"><span className="mobile-label">Horario</span><span>{c.horaInicio} - {c.horaFin}</span></div><div style={{marginTop:10}}><button className="btn-danger" onClick={()=>borrarConfig(c.id)}>Eliminar</button></div></MobileAccordion>))}</div>
            </div>
        </div>
    )
}

function FinanzasReporte({total,count,reservas}){ return ( <div><div className="page-header"><div className="page-title"><h1>Reporte Financiero</h1></div></div><div className="kpi-grid"><div className="kpi-box"><div className="kpi-label">Ingresos</div><div className="kpi-value">{fmtMoney(total)}</div></div><div className="kpi-box"><div className="kpi-label">Citas</div><div className="kpi-value">{count}</div></div></div></div> ) }

function WebPaciente() {
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