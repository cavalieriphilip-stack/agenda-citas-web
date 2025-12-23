import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import Login from './pages/LoginPage'; 
import './App.css'; 
import {
    API_BASE_URL, getPacientes, getProfesionales, getHorariosByProfesional,
    getReservasDetalle, crearReserva, crearPaciente, cancelarReserva, reagendarReserva,
    updatePaciente, deletePaciente, getConfiguraciones, deleteConfiguracion,
    buscarPacientePorRut, updateProfesional, deleteProfesional
} from './api';

// Inicializar MercadoPago
initMercadoPago('APP_USR-a5a67c3b-4b4b-44a1-b973-ff2fd82fe90a', { locale: 'es-CL' });

// --- HELPERS ---
const fmtMoney = (v) => `$${v.toLocaleString('es-CL')}`;
const parseDate = (iso) => iso ? (iso.endsWith('Z') ? new Date(iso) : new Date(iso + 'Z')) : new Date();
const fmtDate = (iso) => iso ? parseDate(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', timeZone: 'UTC' }) : '-';
const fmtTime = (iso) => iso ? parseDate(iso).toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', timeZone: 'UTC' }) : '-';
const toDateKey = (iso) => iso ? iso.split('T')[0] : '';
const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

const getCategoryFromSpecialty = (specName) => {
    const s = (specName || '').toLowerCase();
    if (s.includes('pack')) return 'Packs'; 
    if (s.includes('fonoaudiología') || s.includes('fonoaudiologia')) return 'Fonoaudiología';
    if (s.includes('psicopedagogía') || s.includes('psicopedagogia')) return 'Psicopedagogía';
    if (s.includes('psicología') || s.includes('psicologia') || s.includes('tea') || s.includes('emocional')) return 'Psicología';
    if (s.includes('matrona') || s.includes('lactancia')) return 'Matrona';
    if (s.includes('terapia ocupacional')) return 'Terapia Ocupacional';
    return 'Otros';
};

const formatRut = (rut) => {
    if (!rut) return '';
    let value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (value.length < 2) return value;
    return value.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + '-' + value.slice(-1);
};

const validateRut = (rut) => {
    if (!rut || rut.length < 2) return false;
    const value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    const body = value.slice(0, -1);
    const dv = value.slice(-1);
    let suma = 0, multiplo = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(body.charAt(i));
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
    return dvCalculado === dv;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// --- COMPONENTES UI ---
function MultiSelectDropdown({ options, selectedValues, onChange, label, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const safeSelected = Array.isArray(selectedValues) ? selectedValues : [];

    useEffect(() => {
        function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
        document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="dropdown-wrapper" ref={wrapperRef}>
            <label className="form-label">{label}</label>
            <div 
                className="dropdown-header" 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#f9fafb' : '#fff' }}
            >
                <span>{safeSelected.length > 0 ? `${safeSelected.length} seleccionados` : 'Seleccionar...'}</span>
                <span>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && !disabled && (
                <div className="dropdown-list">
                    {options.map(opt => (
                        <div key={opt} className="dropdown-item" onClick={() => {
                            if (safeSelected.includes(opt)) onChange(safeSelected.filter(v => v !== opt));
                            else onChange([...safeSelected, opt]);
                        }}>
                            <input type="checkbox" checked={safeSelected.includes(opt)} readOnly />
                            <span>{opt}</span>
                        </div>
                    ))}
                </div>
            )}
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

// ==========================================
// 🚀 APP PRINCIPAL
// ==========================================
function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="/" element={<WebPaciente />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

// ==========================================
// 🔐 LAYOUT ADMIN (Navegación Corregida)
// ==========================================
function AdminLayout() {
    const [activeModule, setActiveModule] = useState('agenda');
    const [activeView, setActiveView] = useState('resumen');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    const isAdmin = user.rol === 'ADMIN';

    useEffect(() => { if (!user.id) navigate('/login'); }, [navigate, user.id]);

    const handleNavClick = (view) => { setActiveView(view); setMobileMenuOpen(false); }
    const handleModuleSwitch = (mod, view) => { setActiveModule(mod); setActiveView(view); setMobileMenuOpen(false); }
    
    return (
        <div className="dashboard-layout">
            <nav className="top-nav">
                <div className="brand-area">
                    <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
                    <img src={LOGO_URL} alt="Logo" className="cisd-logo-admin" />
                    <span className="admin-title-text">CISD {isAdmin ? 'Admin' : 'Profesional'}</span>
                </div>
                {/* Switcher Desktop */}
                <div className="module-switcher desktop-view-only">
                    <button className={`module-tab ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => handleModuleSwitch('agenda', 'resumen')}>Clínica</button>
                    <button className={`module-tab ${activeModule === 'clientes' ? 'active' : ''}`} onClick={() => handleModuleSwitch('clientes', 'listado')}>Pacientes</button>
                    {isAdmin && <button className={`module-tab ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => handleModuleSwitch('finanzas', 'reporte')}>Finanzas</button>}
                </div>
                <div className="nav-actions">
                    <span className="desktop-view-only" style={{marginRight:10, fontSize:'0.9rem', fontWeight:'600'}}>{user.nombre}</span>
                    <button onClick={() => {localStorage.removeItem('usuario'); navigate('/login');}} className="btn-danger" style={{padding:'5px 15px', fontSize:'0.8rem'}}>Salir</button>
                </div>
            </nav>
            <div className="workspace">
                {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>}
                <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                    {/* ✅ SECCIÓN DE MÓDULOS EN MÓVIL */}
                    <div className="mobile-view-only" style={{marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #eee'}}>
                        <div className="sidebar-header">MÓDULOS</div>
                        <div className={`nav-item ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => handleModuleSwitch('agenda', 'resumen')}>🏥 Clínica</div>
                        <div className={`nav-item ${activeModule === 'clientes' ? 'active' : ''}`} onClick={() => handleModuleSwitch('clientes', 'listado')}>👥 Pacientes</div>
                        {isAdmin && <div className={`nav-item ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => handleModuleSwitch('finanzas', 'reporte')}>💰 Finanzas</div>}
                    </div>

                    <div className="sidebar-header">NAVEGACIÓN</div>
                    {activeModule === 'agenda' && (
                        <>
                            <div className={`nav-item ${activeView==='resumen'?'active':''}`} onClick={()=>handleNavClick('resumen')}>Calendario</div>
                            <div className={`nav-item ${activeView==='reservas'?'active':''}`} onClick={()=>handleNavClick('reservas')}>Nueva Reserva</div>
                            <div className={`nav-item ${activeView==='horarios'?'active':''}`} onClick={()=>handleNavClick('horarios')}>Mis Horarios</div>
                            {isAdmin && (
                                <>
                                    <div className="sidebar-header" style={{marginTop:20}}>ADMINISTRACIÓN</div>
                                    <div className={`nav-item ${activeView==='profesionales'?'active':''}`} onClick={()=>handleNavClick('profesionales')}>Profesionales</div>
                                    <div className={`nav-item ${activeView==='prestaciones'?'active':''}`} onClick={()=>handleNavClick('prestaciones')}>Prestaciones</div>
                                </>
                            )}
                        </>
                    )}
                    {activeModule === 'clientes' && <div className={`nav-item ${activeView==='listado'?'active':''}`} onClick={()=>handleNavClick('listado')}>Listado de Pacientes</div>}
                    {isAdmin && activeModule === 'finanzas' && <div className={`nav-item ${activeView==='reporte'?'active':''}`} onClick={()=>handleNavClick('reporte')}>Ver Reportes</div>}
                </aside>
                <main className="main-stage">
                    <DashboardContent module={activeModule} view={activeView} user={user} isAdmin={isAdmin} />
                </main>
            </div>
        </div>
    );
}

function DashboardContent({ module, view, user, isAdmin }) {
    const [reservas, setReservas] = useState([]);
    const [tratamientos, setTratamientos] = useState([]);
    
    const refreshData = async () => {
        try {
            const data = await getReservasDetalle(); 
            setReservas(data || []);
            const trats = await fetch(`${API_BASE_URL}/tratamientos`).then(r => r.json());
            setTratamientos(trats || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { refreshData(); }, []);

    if (module === 'agenda') {
        if (view === 'resumen') return <AgendaResumen reservas={reservas} tratamientos={tratamientos} reload={refreshData} user={user} isAdmin={isAdmin} />;
        if (view === 'reservas') return <AgendaNuevaReserva reload={refreshData} reservas={reservas} tratamientos={tratamientos} user={user} isAdmin={isAdmin} />;
        if (view === 'horarios') return <AgendaHorarios user={user} isAdmin={isAdmin} />;
        if (isAdmin) {
            if (view === 'profesionales') return <AgendaProfesionales tratamientos={tratamientos} />;
            if (view === 'prestaciones') return <AgendaTratamientos reload={refreshData} />;
        } else {
            if (view === 'profesionales' || view === 'prestaciones') return <AgendaResumen reservas={reservas} tratamientos={tratamientos} reload={refreshData} user={user} isAdmin={isAdmin} />;
        }
    }
    if (module === 'clientes') return <AgendaPacientes />;
    if (module === 'finanzas' && isAdmin) {
        const total = reservas.reduce((acc, r) => { 
            const m = tratamientos.find(t => t.nombre === r.motivo) || { valor: 0 }; 
            return acc + m.valor; 
        }, 0);
        return <FinanzasReporte total={total} count={reservas.length} reservas={reservas} />;
    }
    return <div>Cargando...</div>;
}

// ==========================================
// 📅 COMPONENTES
// ==========================================

function AgendaResumen({reservas, tratamientos, reload, user, isAdmin}){
    const [pros, setPros] = useState([]);
    const [filterPro, setFilterPro] = useState(isAdmin ? '' : user.id);
    const [view, setView] = useState('week'); 
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null); 
    const [editId, setEditId] = useState(null);
    const [editProId, setEditProId] = useState('');
    const [editTratamiento, setEditTratamiento] = useState('');
    const [editHorarioId, setEditHorarioId] = useState('');
    const [horariosDisponibles, setHorariosDisponibles] = useState([]);
    
    useEffect(()=>{ getProfesionales().then(setPros) },[]);
    
    const handleNav = (dir) => { const d = new Date(currentDate); if(view === 'day') d.setDate(d.getDate() + dir); if(view === 'week') d.setDate(d.getDate() + (dir*7)); setCurrentDate(d); };
    const getDays = () => { const d = [], start = new Date(currentDate); if(view==='day'){ d.push(new Date(start)); } else if(view==='week'){ const day = start.getDay(), diff = start.getDate() - day + (day===0?-6:1); const mon = new Date(start.setDate(diff)); for(let i=0;i<7;i++){ const x = new Date(mon); x.setDate(mon.getDate()+i); d.push(x); } } return d; };
    const days = getDays();
    const activeFilter = isAdmin ? filterPro : user.id;
    const filtered = reservas.filter(r => activeFilter ? r.profesionalId === parseInt(activeFilter) : true);

    const handleEventClick = (r) => { if (!isAdmin && r.profesionalId !== user.id) return; const match = tratamientos.find(t => t.nombre === r.motivo); setSelectedEvent({ ...r, fullTrat: match }); setEditId(null); };
    const deleteReserva = async(id) => { if(confirm('¿Eliminar?')){await cancelarReserva(id);reload(); setSelectedEvent(null);} };
    const startEdit = async(r) => { setEditId(r.id); setEditProId(r.profesionalId.toString()); setEditTratamiento(r.motivo); const h = await getHorariosByProfesional(r.profesionalId); setHorariosDisponibles(Array.isArray(h) ? h : []); };
    const handleProChange = async(pid) => { setEditProId(pid); setEditTratamiento(''); setEditHorarioId(''); if (pid) { const h = await getHorariosByProfesional(pid); setHorariosDisponibles(Array.isArray(h) ? h : []); } };
    const saveEdit = async () => { if(!editHorarioId) return alert('Selecciona hora'); try{ await reagendarReserva(selectedEvent.id, editHorarioId, editProId, editTratamiento); alert('Modificado'); setSelectedEvent(null); setEditId(null); reload(); } catch(e){ alert('Error'); } };
    
    return ( 
        <div style={{height:'100%', display:'flex', flexDirection:'column'}}> 
            <div className="page-header"><div className="page-title"><h1>Calendario {isAdmin ? 'Global' : 'Personal'}</h1></div></div> 
            <div className="dashboard-controls"> 
                {isAdmin ? ( <select className="form-control" style={{maxWidth:250}} value={filterPro} onChange={e=>setFilterPro(e.target.value)}> <option value="">Todos los Profesionales</option> {pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)} </select> ) : ( <div style={{padding:'10px', background:'#eee', borderRadius:'8px', fontWeight:'bold'}}>{user.nombre}</div> )}
                <div className="view-buttons-group"> <button className={`calendar-nav-btn ${view==='day'?'active':''}`} onClick={()=>setView('day')}>Día</button> <button className={`calendar-nav-btn ${view==='week'?'active':''}`} onClick={()=>setView('week')}>Semana</button> </div> 
                <div className="cal-nav-group"> <button className="calendar-nav-btn" onClick={()=>handleNav(-1)}>‹</button> <span>{`Semana del ${days[0]?.getDate()}`}</span> <button className="calendar-nav-btn" onClick={()=>handleNav(1)}>›</button> </div> 
            </div> 
            <div className="calendar-grid-wrapper"> 
                <div className="cal-header-row" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}> <div className="cal-header-cell">Hora</div> {days.map((d, i)=><div key={i} className="cal-header-cell">{d.toLocaleDateString('es-CL',{weekday:'short', day:'numeric'})}</div>)} </div> 
                <div className="calendar-body" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}> 
                    <div>{Array.from({length:13},(_,i)=>i+8).map(h=><div key={h} className="cal-time-label">{h}:00</div>)}</div> 
                    {days.map((d, i)=>( <div key={i} className="cal-day-col"> {filtered.filter(r=>{ const rd=parseDate(r.fecha); return rd.getDate()===d.getDate() && rd.getMonth()===d.getMonth(); }).map(r=>{ const st = parseDate(r.fecha), h=st.getUTCHours(), m=st.getUTCMinutes(); const top = ((h-8)*60)+m; return ( <div key={r.id} className="cal-event evt-blue" style={{top, height:45}} onClick={()=>handleEventClick(r)}> <strong>{st.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'})}</strong> <span>{r.pacienteNombre}</span> </div> ) })} </div> ))} 
                </div> 
            </div> 
            {selectedEvent && ( <Modal onClose={()=>setSelectedEvent(null)}> {editId === selectedEvent.id ? ( <div style={{padding:10}}> <h2>Modificar Cita</h2> {isAdmin ? (<select className="form-control" value={editProId} onChange={e=>handleProChange(e.target.value)}>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select>) : (<p><strong>Profesional:</strong> {user.nombre}</p>)} <select className="form-control" value={editHorarioId} onChange={e=>setEditHorarioId(e.target.value)}><option value="">Hora...</option>{horariosDisponibles.map(h=><option key={h.id} value={h.id}>{fmtDate(h.fecha)} - {fmtTime(h.fecha)}</option>)}</select> <div className="detail-actions" style={{marginTop:10}}> <button className="btn-primary" onClick={saveEdit}>Guardar</button> <button className="btn-edit" onClick={()=>setEditId(null)}>Cancelar</button> </div> </div> ) : ( <div style={{padding:10}}> <h2>Detalle</h2> <p>Paciente: {selectedEvent.pacienteNombre}</p> <p>Tratamiento: {selectedEvent.motivo}</p> <div className="detail-actions" style={{marginTop:10}}> <button className="btn-primary" onClick={()=>startEdit(selectedEvent)}>Modificar</button> <button className="btn-danger" onClick={()=>deleteReserva(selectedEvent.id)}>Eliminar</button> </div> </div> )} </Modal> )} 
        </div> 
    );
}

function AgendaNuevaReserva({ reload, reservas, tratamientos, user, isAdmin }) {
    const [pacientes, setPacientes] = useState([]);
    const [pros, setPros] = useState([]);
    const [horarios, setHorarios] = useState([]);
    const [form, setForm] = useState({ pacienteId: '', profesionalId: isAdmin ? '' : user.id, horarioId: '', especialidad: '', tratamientoId: '' });
    
    useEffect(() => { getPacientes().then(setPacientes); getProfesionales().then(setPros); if (!isAdmin && user.id) { handlePro(user.id); } }, []);
    
    const especialidades = [...new Set(tratamientos.map(t => t.especialidad))];
    const prestaciones = tratamientos.filter(t => t.especialidad === form.especialidad);
    const prosFiltrados = isAdmin ? (form.tratamientoId ? pros.filter(p => { const trat = tratamientos.find(x => x.id === parseInt(form.tratamientoId)); return trat && p.tratamientos && p.tratamientos.includes(trat.nombre); }) : []) : [user];
    
    const handlePro = async (pid) => { setForm(prev => ({ ...prev, profesionalId: pid })); setHorarios([]); if (!pid) return; try { const h = await getHorariosByProfesional(pid); if (Array.isArray(h)) setHorarios(h.filter(x => new Date(x.fecha) > new Date())); } catch(e) { setHorarios([]); } }
    const save = async (e) => { e.preventDefault(); if (!form.tratamientoId) return alert("Faltan datos"); const trat = tratamientos.find(t => t.id === parseInt(form.tratamientoId)); try { await crearReserva({ pacienteId: parseInt(form.pacienteId), profesionalId: parseInt(form.profesionalId), horarioDisponibleId: form.horarioId, motivo: trat.nombre }); alert('Creada'); reload(); } catch (e) { alert('Error'); } };
    
    return ( <div> <div className="page-header"><div className="page-title"><h1>Nueva Reserva Manual</h1></div></div> <div className="pro-card"> <form onSubmit={save}> <div className="input-row"> <div><label className="form-label">Especialidad</label><select className="form-control" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value, tratamientoId: '' })}><option>Seleccionar...</option>{especialidades.map(e => <option key={e} value={e}>{e}</option>)}</select></div> <div><label className="form-label">Tratamiento</label><select className="form-control" disabled={!form.especialidad} value={form.tratamientoId} onChange={e => setForm({ ...form, tratamientoId: e.target.value })}><option>Seleccionar...</option>{prestaciones.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div> </div> <div className="input-row"> <div><label className="form-label">Paciente</label><select className="form-control" value={form.pacienteId} onChange={e => setForm({ ...form, pacienteId: e.target.value })}><option>Seleccionar...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto} ({formatRut(p.rut)})</option>)}</select></div> <div> <label className="form-label">Profesional</label> {isAdmin ? ( <select className="form-control" disabled={!form.tratamientoId} value={form.profesionalId} onChange={e => handlePro(e.target.value)}><option>Seleccionar...</option>{prosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select> ) : ( <input className="form-control" value={user.nombre} disabled /> )} </div> </div> <div style={{ marginBottom: 20 }}> <label className="form-label">Horario</label> <select className="form-control" onChange={e => setForm({ ...form, horarioId: e.target.value })}><option>Seleccionar...</option>{Array.isArray(horarios) && horarios.map(h => <option key={h.id} value={h.id}>{fmtDate(h.fecha)} - {fmtTime(h.fecha)}</option>)}</select> </div> <button className="btn-primary">Crear Reserva</button> </form> </div> </div> );
}

function AgendaHorarios({ user, isAdmin }){
    const [pros,setPros]=useState([]);
    const [configs, setConfigs] = useState([]);
    const [fechaSel, setFechaSel] = useState('');
    const [form,setForm]=useState({profesionalId: isAdmin ? '' : user.id, diaSemana:'', horaInicio:'09:00', horaFin:'18:00', duracionSlot: 30, intervalo: 0});
    const [showModal, setShowModal] = useState(false);
    const [events, setEvents] = useState([]);
    const [selectedProName, setSelectedProName] = useState('');
    
    useEffect(()=>{ getProfesionales().then(setPros); loadConfigs(); },[]);
    
    const loadConfigs = async () => { try { const data = await getConfiguraciones(); if (isAdmin) { setConfigs(Array.isArray(data) ? data : []); } else { setConfigs(Array.isArray(data) ? data.filter(c => c.profesionalId === user.id) : []); } } catch (e) { setConfigs([]); } };
    const save = async (e) => { e.preventDefault(); try { const payload = { ...form, fecha: fechaSel }; const response = await fetch(`${API_BASE_URL}/configuracion`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Error desconocido al guardar"); } alert("✅ Horario guardado correctamente"); await loadConfigs(); } catch(e) { alert("❌ Error: " + e.message); } };
    const borrarConfig = async (id) => { if(confirm("¿Eliminar?")) { await deleteConfiguracion(id); loadConfigs(); } }
    const verCalendario = async (p) => { setSelectedProName(p.nombreCompleto); const [reservasData, slotsData] = await Promise.all([getReservasDetalle(), getHorariosByProfesional(p.id)]); const misReservas = reservasData.filter(r => r.profesionalId === p.id).map(r => ({ id: r.id, title: r.pacienteNombre, start: parseDate(r.fecha), type: 'occupied' })); const misBloques = slotsData.map((s, i) => ({ id: `slot-${i}`, title: 'Disponible', start: parseDate(s.fecha), type: 'available' })); setEvents([...misBloques, ...misReservas]); setShowModal(true); };

    return( 
        <div> 
            <div className="page-header"><div className="page-title"><h1>Configuración de Horarios</h1></div></div> 
            <div className="pro-card"> 
                <form onSubmit={save}> 
                    <div className="input-row"> <div> <label className="form-label">Profesional</label> {isAdmin ? ( <select className="form-control" onChange={e=>setForm({...form,profesionalId:e.target.value})}><option>Seleccionar...</option>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select> ) : ( <input className="form-control" value={user.nombre} disabled /> )} </div> <div><label className="form-label">Fecha del Bloque</label><input type="date" className="form-control" onChange={e=>setFechaSel(e.target.value)} /></div> </div> <div className="input-row"><div><label className="form-label">Inicio</label><input type="time" className="form-control" value={form.horaInicio} onChange={e=>setForm({...form,horaInicio:e.target.value})}/></div><div><label className="form-label">Fin</label><input type="time" className="form-control" value={form.horaFin} onChange={e=>setForm({...form,horaFin:e.target.value})}/></div></div> <div className="input-row"><div><label className="form-label">Duración (Min)</label><select className="form-control" value={form.duracionSlot} onChange={e=>setForm({...form, duracionSlot: e.target.value})}><option value="15">15 Min</option><option value="30">30 Min</option><option value="45">45 Min</option><option value="60">60 Min</option></select></div><div><label className="form-label">Descanso (Min)</label><input type="number" className="form-control" value={form.intervalo} onChange={e=>setForm({...form, intervalo: e.target.value})} /></div></div> <button className="btn-primary">Guardar Disponibilidad</button> 
                </form> 
            </div> 
            <div className="pro-card"> 
                <h3>Bloques Configurados</h3> 
                {/* DESKTOP */}
                <div className="data-table-container desktop-view-only">
                    <table className="data-table"><thead><tr><th>Profesional</th><th>Fecha</th><th>Horario</th><th>Acción</th></tr></thead><tbody>{configs.map(c=>(<tr key={c.id}><td>{c.profesional?.nombreCompleto}</td><td>{c.fecha}</td><td>{c.horaInicio} - {c.horaFin}</td><td><button className="btn-danger" onClick={()=>borrarConfig(c.id)}>Eliminar</button></td></tr>))}</tbody></table>
                </div> 
                {/* MOVIL */}
                <div className="mobile-view-only">
                    {configs.map(c => (
                        <div key={c.id} className="mobile-card">
                            <div className="mobile-card-header">
                                <span className="mobile-card-title">{c.profesional?.nombreCompleto}</span>
                                <button className="btn-danger" onClick={()=>borrarConfig(c.id)} style={{fontSize:'0.8rem', padding:'5px 10px'}}>Eliminar</button>
                            </div>
                            <div className="mobile-card-body">
                                <div className="mobile-data-row"><span className="mobile-label">Fecha</span>{c.fecha}</div>
                                <div className="mobile-data-row"><span className="mobile-label">Horario</span>{c.horaInicio} - {c.horaFin}</div>
                            </div>
                        </div>
                    ))}
                    {configs.length === 0 && <p style={{color:'#888', fontStyle:'italic', padding:10}}>No hay horarios configurados.</p>}
                </div>
            </div> 
            <div className="pro-card"> 
                <h3>Ver Calendario Visual (Popup)</h3> 
                <div className="data-table-container desktop-view-only">
                    <table className="data-table"><thead><tr><th>Profesional</th><th>Acción</th></tr></thead><tbody>{pros.filter(p => isAdmin ? true : p.id === user.id).map(p=>(<tr key={p.id}><td>{p.nombreCompleto}</td><td><button className="btn-edit" onClick={()=>verCalendario(p)}>Ver Horarios</button></td></tr>))}</tbody></table>
                </div>
                <div className="mobile-view-only">
                    {pros.filter(p => isAdmin ? true : p.id === user.id).map(p => (
                        <div key={p.id} className="mobile-card">
                            <div className="mobile-card-header">
                                <span className="mobile-card-title">{p.nombreCompleto}</span>
                                <button className="btn-edit" onClick={()=>verCalendario(p)} style={{fontSize:'0.8rem'}}>Ver</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div> 
            {showModal && ( <Modal title={`Horarios: ${selectedProName}`} onClose={()=>setShowModal(false)}> {events.length === 0 ? <p>No hay datos.</p> : events.sort((a,b)=>a.start-b.start).map((e, i) => ( <div key={i} style={{marginBottom:10, padding:10, borderRadius:6, background: e.type==='available'?'#f0fdf4':'#eff6ff', borderLeft: e.type==='available'?'3px solid #22c55e':'3px solid #3b82f6'}}> <strong>{fmtDate(e.start.toISOString())}</strong> - {fmtTime(e.start.toISOString())} <div style={{fontSize:'0.85rem'}}>{e.title}</div> </div> )) } </Modal> )} 
        </div> 
    );
}

function AgendaProfesionales({ tratamientos }) {
    const [pros, setPros] = useState([]);
    const [form, setForm] = useState({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] });
    const [isEditing, setIsEditing] = useState(false);
    const especialidadesUnicas = [...new Set(tratamientos.map(t => t.especialidad))].sort();
    const tratamientosDisponibles = tratamientos.filter(t => form.especialidades.includes(t.especialidad)).map(t => t.nombre).sort();
    const load = () => getProfesionales().then(setPros);
    useEffect(() => { load(); }, []);
    const handleSpecChange = (newSpecs) => { const tratamientosValidos = tratamientos.filter(t => newSpecs.includes(t.especialidad) && form.tratamientos.includes(t.nombre)).map(t => t.nombre); setForm({ ...form, especialidades: newSpecs, tratamientos: tratamientosValidos }); };
    const save = async (e) => { e.preventDefault(); const payload = { nombreCompleto: form.nombreCompleto, especialidad: form.especialidades.join(', '), tratamientos: form.tratamientos.join(', ') }; try { if (isEditing) await updateProfesional(form.id, payload); else await fetch(`${API_BASE_URL}/profesionales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); alert('Guardado'); setIsEditing(false); setForm({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] }); load(); } catch (e) { alert("Error al guardar"); } };
    const handleEdit = (p) => { setForm({ id: p.id, nombreCompleto: p.nombreCompleto, especialidades: p.especialidad ? p.especialidad.split(', ').map(s=>s.trim()) : [], tratamientos: p.tratamientos ? p.tratamientos.split(', ').map(s=>s.trim()) : [] }); setIsEditing(true); window.scrollTo(0, 0); };
    const handleDelete = async (id) => { if (confirm('¿Eliminar profesional?')) { await deleteProfesional(id); load(); } };

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Profesionales</h1></div></div>
            <div className="pro-card">
                <h3>{isEditing ? 'Editar Profesional' : 'Nuevo Profesional'}</h3>
                <form onSubmit={save}>
                    <div className="input-row"> <div style={{width: '100%'}}> <label className="form-label">Nombre Completo</label> <input className="form-control" value={form.nombreCompleto} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} required /> </div> </div>
                    <div className="input-row"> <div> <MultiSelectDropdown label="1. Especialidades (Áreas)" options={especialidadesUnicas} selectedValues={form.especialidades} onChange={handleSpecChange} /> </div> <div> <MultiSelectDropdown label="2. Prestaciones Habilitadas" options={tratamientosDisponibles} selectedValues={form.tratamientos} onChange={v => setForm({ ...form, tratamientos: v })} disabled={form.especialidades.length === 0} /> </div> </div>
                    <button className="btn-primary">Guardar</button> {isEditing && <button type="button" className="btn-edit" onClick={() => { setIsEditing(false); setForm({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] }); }} style={{marginLeft: 10}}>Cancelar</button>}
                </form>
            </div>
            <div className="pro-card">
                <div className="data-table-container desktop-view-only">
                    <table className="data-table"><thead><tr><th>Nombre</th><th>Especialidad</th><th>Acciones</th></tr></thead><tbody>{pros.map(p => ( <tr key={p.id}> <td>{p.nombreCompleto}</td> <td>{p.especialidad}</td> <td> <button className="btn-edit" onClick={() => handleEdit(p)}>Editar</button> <button className="btn-danger" onClick={() => handleDelete(p.id)}>X</button> </td> </tr> ))}</tbody></table>
                </div>
                {/* ✅ MOVIL: BOTONES EDITAR Y ELIMINAR AGREGADOS */}
                <div className="mobile-view-only">
                    {pros.map(p => (
                        <div key={p.id} className="mobile-card">
                            <div className="mobile-card-header" onClick={() => handleEdit(p)}>
                                <span className="mobile-card-title">{p.nombreCompleto}</span>
                                <div style={{display:'flex', gap:10}}>
                                    <button className="btn-edit" onClick={(e) => {e.stopPropagation(); handleEdit(p)}} style={{fontSize:'0.8rem'}}>Editar</button>
                                    <button className="btn-danger" onClick={(e) => {e.stopPropagation(); handleDelete(p.id)}} style={{fontSize:'0.8rem'}}>X</button>
                                </div>
                            </div>
                            <div className="mobile-card-body">
                                <div className="mobile-data-row"><span className="mobile-label">Especialidad</span>{p.especialidad}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AgendaTratamientos({ reload }) {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '' });
    const [isEditing, setIsEditing] = useState(false);
    const load = () => fetch(`${API_BASE_URL}/tratamientos`).then(r => r.json()).then(setItems);
    useEffect(() => { load(); }, []);
    const save = async (e) => { e.preventDefault(); const method = isEditing ? 'PUT' : 'POST'; const url = isEditing ? `${API_BASE_URL}/tratamientos/${form.id}` : `${API_BASE_URL}/tratamientos`; await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) }); setForm({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '' }); setIsEditing(false); load(); if(reload) reload(); };
    const handleEdit = (it) => { setForm(it); setIsEditing(true); window.scrollTo(0,0); };
    const handleDelete = async (id) => { if(confirm('¿Eliminar?')) { await fetch(`${API_BASE_URL}/tratamientos/${id}`, { method: 'DELETE' }); load(); } };
    
    return ( <div> <div className="page-header"><div className="page-title"><h1>Gestión de Prestaciones</h1></div></div> <div className="pro-card"> <h3>{isEditing ? 'Editar' : 'Nueva'}</h3> <form onSubmit={save}> <div className="input-row"> <div><label className="form-label">Nombre del Tratamiento</label><input className="form-control" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required /></div> <div><label className="form-label">Especialidad (Pública)</label><input className="form-control" value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value})} required /></div> </div> <div className="input-row"> <div><label className="form-label">Código</label><input className="form-control" value={form.codigo} onChange={e=>setForm({...form, codigo:e.target.value})} /></div> <div><label className="form-label">Valor</label><input type="number" className="form-control" value={form.valor} onChange={e=>setForm({...form, valor:e.target.value})} required /></div> </div> <button className="btn-primary">Guardar</button> {isEditing && <button type="button" className="btn-edit" style={{marginLeft:10}} onClick={()=>{setIsEditing(false); setForm({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '' })}}>Cancelar</button>} </form> </div> <div className="pro-card"> <div className="data-table-container desktop-view-only"> <table className="data-table"> <thead><tr><th>Código</th><th>Tratamiento</th><th>Especialidad</th><th>Valor</th><th>Acciones</th></tr></thead> <tbody> {items.map(it => ( <tr key={it.id}> <td>{it.codigo}</td> <td>{it.nombre}</td> <td>{it.especialidad}</td> <td>{fmtMoney(it.valor)}</td> <td> <button className="btn-edit" onClick={()=>handleEdit(it)}>Edit</button> <button className="btn-danger" onClick={()=>handleDelete(it.id)}>X</button> </td> </tr> ))} </tbody> </table> </div> 
    {/* ✅ MOVIL: BOTONES EDITAR Y ELIMINAR AGREGADOS */}
    <div className="mobile-view-only">
        {items.map(it => (
            <div key={it.id} className="mobile-card">
                <div className="mobile-card-header" onClick={()=>handleEdit(it)}>
                    <span className="mobile-card-title">{it.nombre}</span>
                    <div style={{display:'flex', gap:10}}>
                        <button className="btn-edit" onClick={(e)=>{e.stopPropagation(); handleEdit(it)}} style={{fontSize:'0.8rem'}}>Editar</button>
                        <button className="btn-danger" onClick={(e)=>{e.stopPropagation(); handleDelete(it.id)}} style={{fontSize:'0.8rem'}}>X</button>
                    </div>
                </div>
                <div className="mobile-card-body">
                    <div className="mobile-data-row"><span className="mobile-label">Código</span>{it.codigo}</div>
                    <div className="mobile-data-row"><span className="mobile-label">Valor</span>{fmtMoney(it.valor)}</div>
                </div>
            </div>
        ))}
    </div>
    </div> </div> );
}

function AgendaPacientes(){
    const [pacientes,setPacientes]=useState([]);
    const [form,setForm]=useState({nombreCompleto:'',email:'',telefono:'', rut:''});
    const [editingId, setEditingId] = useState(null);
    const [historyPatient, setHistoryPatient] = useState(null); 
    const [historyData, setHistoryData] = useState([]);
    
    const load=()=>getPacientes().then(setPacientes);
    useEffect(()=>{load()},[]);
    
    const handleRutChange = (e) => { const raw = e.target.value; const formatted = formatRut(raw); setForm({...form, rut: formatted}); }
    const save=async(e)=>{ e.preventDefault(); if (!validateRut(form.rut)) { alert("RUT inválido"); return; } try { if(editingId) { await updatePaciente(editingId, form); alert('Actualizado'); setEditingId(null); } else { await crearPaciente(form); alert('Creado'); } setForm({nombreCompleto:'',email:'',telefono:'', rut:''}); load(); } catch(e) { alert("Error"); } };
    const handleEdit = (p) => { setForm({ nombreCompleto: p.nombreCompleto, email: p.email, telefono: p.telefono, rut: formatRut(p.rut||'') }); setEditingId(p.id); window.scrollTo(0, 0); };
    const handleDelete = async (id) => { if(confirm('¿Seguro?')) { await deletePaciente(id); load(); } };
    const viewHistory = async (p) => { setHistoryPatient(p); const res = await fetch(`${API_BASE_URL}/pacientes/${p.id}/historial`).then(r => r.json()); setHistoryData(res); };
    
    return( <div> <div className="page-header"><div className="page-title"><h1>Base de Pacientes</h1></div></div> <div className="pro-card"> <h3 style={{marginTop:0}}>{editingId ? 'Editar Paciente' : 'Nuevo Paciente'}</h3> <form onSubmit={save}> <div className="input-row"><div><label className="form-label">RUT</label><input className="form-control" value={form.rut} onChange={handleRutChange} /></div><div><label className="form-label">Nombre</label><input className="form-control" value={form.nombreCompleto} onChange={e=>setForm({...form,nombreCompleto:e.target.value})}/></div></div> <div className="input-row"><div><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><label className="form-label">Teléfono</label><input className="form-control" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></div></div> <button className="btn-primary">Guardar</button> </form> </div> <div className="pro-card"> <div className="data-table-container desktop-view-only"> <table className="data-table"> <thead><tr><th>RUT</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Opciones</th></tr></thead> <tbody>{pacientes.map(p=>( <tr key={p.id}> <td>{formatRut(p.rut)}</td> <td><strong>{p.nombreCompleto}</strong></td> <td>{p.email}</td> <td>{p.telefono}</td> <td> <div style={{display:'flex', gap:5}}> <button className="btn-primary" style={{padding:'5px 10px', fontSize:'0.8rem'}} onClick={()=>viewHistory(p)}>Historial</button> <button className="btn-edit" onClick={()=>handleEdit(p)}>Editar</button> <button className="btn-danger" onClick={()=>handleDelete(p.id)}>X</button> </div> </td> </tr> ))}</tbody> </table> </div> 
    {/* MOVIL */}
    <div className="mobile-view-only">
        {pacientes.map(p => (
            <div key={p.id} className="mobile-card">
                <div className="mobile-card-header">
                    <span className="mobile-card-title">{p.nombreCompleto}</span>
                    <div style={{display:'flex', gap:10}}>
                        <button className="btn-primary" onClick={()=>viewHistory(p)} style={{fontSize:'0.8rem'}}>Historial</button>
                    </div>
                </div>
                <div className="mobile-card-body">
                    <div className="mobile-data-row"><span className="mobile-label">RUT</span>{formatRut(p.rut)}</div>
                    <div className="mobile-data-row"><span className="mobile-label">Email</span>{p.email}</div>
                    <div className="mobile-data-row"><span className="mobile-label">Acciones</span>
                        <div style={{display:'flex', gap:10, marginTop:5}}>
                            <button className="btn-edit" onClick={()=>handleEdit(p)} style={{width: '100%'}}>Editar</button>
                            <button className="btn-danger" onClick={()=>handleDelete(p.id)} style={{width: '100%'}}>Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
    </div> {historyPatient && ( <Modal title={`Historial: ${historyPatient.nombreCompleto}`} onClose={()=>setHistoryPatient(null)}> <div className="data-table-container"> <table className="data-table"> <thead><tr><th>Fecha</th><th>Tratamiento</th><th>Profesional</th><th>Estado</th></tr></thead> <tbody> {historyData.length === 0 ? <tr><td colSpan="4">Sin atenciones registradas</td></tr> : historyData.map(h => ( <tr key={h.id}> <td>{fmtDate(h.fechaHoraInicio)}</td> <td>{h.motivo}</td> <td>{h.profesional?.nombreCompleto}</td> <td><span className="badge-success">{h.estado}</span></td> </tr> ))} </tbody> </table> </div> </Modal> )} </div> )
}

function FinanzasReporte({total,count,reservas, tratamientos}){ 
    const statsPro = reservas.reduce((acc, curr) => { acc[curr.profesionalNombre] = (acc[curr.profesionalNombre] || 0) + 1; return acc; }, {});
    const statsTrat = reservas.reduce((acc, curr) => { acc[curr.motivo] = (acc[curr.motivo] || 0) + 1; return acc; }, {});
    return ( <div> <div className="page-header"><div className="page-title"><h1>Reporte Financiero</h1></div></div> <div className="kpi-grid"> <div className="kpi-box"><div className="kpi-label">Ingresos</div><div className="kpi-value">{fmtMoney(total)}</div></div> <div className="kpi-box"><div className="kpi-label">Citas</div><div className="kpi-value">{count}</div></div> </div> <div className="input-row finance-section"> <div className="pro-card"> <h3>Atenciones por Profesional</h3> <div className="data-table-container"> <table className="finance-table"><thead><tr><th>Profesional</th><th>Citas</th></tr></thead><tbody>{Object.entries(statsPro).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table> </div> </div> <div className="pro-card"> <h3>Agendas por Tratamiento</h3> <div className="data-table-container"> <table className="finance-table"><thead><tr><th>Tratamiento</th><th>Cantidad</th></tr></thead><tbody>{Object.entries(statsTrat).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table> </div> </div> </div> </div> ) 
}

// --- WEB PACIENTE ---
function WebPaciente() {
    const [step, setStep] = useState(0); 
    const [profesionales, setProfesionales] = useState([]);
    const [tratamientos, setTratamientos] = useState([]);
    const [form, setForm] = useState({ rut:'', nombre:'', email:'', telefono:'', categoria: '', especialidad:'', tratamientoId:'', profesionalId:'', horarioId:'' });
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [pacienteId, setPacienteId] = useState(null);
    const [multiAgenda, setMultiAgenda] = useState({}); 
    const [selectedDateKey, setSelectedDateKey] = useState(null); 
    const [availableDates, setAvailableDates] = useState([]);
    const [preferenceId, setPreferenceId] = useState(null);
    const [showPayModal, setShowPayModal] = useState(false);

    useEffect(()=>{ 
        getProfesionales().then(setProfesionales);
        fetch(`${API_BASE_URL}/tratamientos`).then(r=>r.json()).then(setTratamientos);
    },[]);

    const categorias = [...new Set(tratamientos.map(t => getCategoryFromSpecialty(t.especialidad)))].sort();
    
    const especialidadesFiltradas = form.categoria 
        ? [...new Set(tratamientos.filter(t => getCategoryFromSpecialty(t.especialidad) === form.categoria).map(t => t.especialidad))]
        : [];

    const prestacionesFiltradas = form.especialidad
        ? tratamientos.filter(t => t.especialidad === form.especialidad)
        : [];

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const status = query.get('status');
        if (status === 'approved') {
            const savedData = localStorage.getItem('pendingReservation');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                const reservarHora = async () => {
                    try {
                        const trats = await fetch(`${API_BASE_URL}/tratamientos`).then(r=>r.json());
                        const trat = trats.find(t => t.id === parseInt(parsed.tratamientoId));
                        const motivoTexto = trat ? trat.nombre : "Consulta";
                        await crearReserva({ pacienteId: parseInt(parsed.pacienteId), profesionalId: parseInt(parsed.profesionalId), horarioDisponibleId: parsed.horarioId, motivo: motivoTexto });
                        setForm(parsed); setBookingSuccess(true); localStorage.removeItem('pendingReservation'); window.history.replaceState({}, document.title, "/reserva-exitosa");
                    } catch (error) { setForm(parsed); setBookingSuccess(true); }
                };
                reservarHora();
            }
        }
    }, []);

    const tratamientoSel = tratamientos.find(t => t.id === parseInt(form.tratamientoId));
    
    const prosAptos = form.tratamientoId 
        ? profesionales.filter(p => tratamientoSel && p.tratamientos && p.tratamientos.includes(tratamientoSel.nombre))
        : [];

    const handleRutSearch = async () => { if(!form.rut) return alert("Ingrese RUT"); if(!validateRut(form.rut)) return alert("RUT inválido"); setLoading(true); try { const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); const paciente = await buscarPacientePorRut(rutLimpio); if (paciente) { setPacienteId(paciente.id); setForm(prev => ({...prev, nombre: paciente.nombreCompleto, email: paciente.email, telefono: paciente.telefono})); setStep(2); } else { setStep(1); } } catch(e) { setStep(1); } setLoading(false); };
    
    const handleTreatmentConfirm = async () => { 
        setLoading(true); 
        if (prosAptos.length === 0) { alert("No hay profesionales disponibles para este tratamiento."); setLoading(false); return; } 
        const promises = prosAptos.map(async p => { const horarios = await getHorariosByProfesional(p.id); return { profesional: p, slots: Array.isArray(horarios) ? horarios.filter(x => new Date(x.fecha) > new Date()) : [] }; }); 
        const results = await Promise.all(promises); 
        const agendaMap = {}; const datesSet = new Set(); 
        results.forEach(({profesional, slots}) => { slots.forEach(slot => { const dateKey = toDateKey(slot.fecha); datesSet.add(dateKey); if (!agendaMap[dateKey]) agendaMap[dateKey] = []; let proEntry = agendaMap[dateKey].find(entry => entry.profesional.id === profesional.id); if (!proEntry) { proEntry = { profesional, slots: [] }; agendaMap[dateKey].push(proEntry); } proEntry.slots.push(slot); }); }); 
        const sortedDates = Array.from(datesSet).sort(); 
        if (sortedDates.length === 0) { alert("No hay horas disponibles próximamente."); setLoading(false); return; } 
        setMultiAgenda(agendaMap); setAvailableDates(sortedDates); if (sortedDates.length > 0) setSelectedDateKey(sortedDates[0]); setLoading(false); setStep(3); 
    };
    
    const selectSlot = (pid, hid) => { setForm(prev => ({ ...prev, profesionalId: pid, horarioId: hid })); setStep(4); };
    const initPaymentProcess = async () => { setLoading(true); const storageData = { ...form, pacienteId: pacienteId }; try { let pid = pacienteId; if (!pid) { const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); const pac = await crearPaciente({nombreCompleto:form.nombre, email:form.email, telefono:form.telefono, rut: rutLimpio}); pid = pac.id; setPacienteId(pid); storageData.pacienteId = pid; } localStorage.setItem('pendingReservation', JSON.stringify(storageData)); const response = await fetch(`${API_BASE_URL}/create_preference`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: tratamientoSel.nombre, quantity: 1, unit_price: tratamientoSel.valor }), }); const preference = await response.json(); if (preference.id) { setPreferenceId(preference.id); setShowPayModal(true); } else { alert("Error al iniciar el pago"); } } catch (error) { console.error(error); alert("Error de conexión"); } finally { setLoading(false); } };
    const goBack = () => { if(step===0)return; if(step===2 && pacienteId) setStep(0); else setStep(step-1); };
    
    const ReservaDetalleCard = ({ title, showTotal }) => { 
        const slotDate = parseDate(form.horarioId || new Date().toISOString()); 
        const fechaStr = slotDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); 
        const horaStr = slotDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); 
        const currentTratamiento = tratamientos.find(t => t.id === parseInt(form.tratamientoId)); 
        let proName = "Asignado"; 
        if (form.profesionalId && profesionales.length > 0) { const p = profesionales.find(pr => pr.id === parseInt(form.profesionalId)); if (p) proName = p.nombreCompleto; } else if (multiAgenda && selectedDateKey && multiAgenda[selectedDateKey]) { const foundEntry = multiAgenda[selectedDateKey].find(e => e.profesional.id === form.profesionalId); if (foundEntry) proName = foundEntry.profesional.nombreCompleto; }
        return ( <div className="conf-card"> <div className="conf-section"> <div className="conf-title">Paciente</div> <div className="conf-row"><span className="conf-label">Nombre</span><span className="conf-value">{form.nombre}</span></div> <div className="conf-row"><span className="conf-label">RUT</span><span className="conf-value">{form.rut}</span></div> </div> <div className="conf-section"> <div className="conf-title">Servicio</div> <div className="conf-row"><span className="conf-label">Tratamiento</span><span className="conf-value">{currentTratamiento?.nombre}</span></div> </div> <div className="conf-section"> <div className="conf-title">Cita</div> <div className="conf-row"><span className="conf-label">Profesional</span><span className="conf-value">{proName}</span></div> <div className="conf-row"><span className="conf-label">Fecha</span><span className="conf-value">{fechaStr}</span></div> <div className="conf-row"><span className="conf-label">Hora</span><span className="conf-value">{horaStr}</span></div> </div> {showTotal && ( <div className="conf-section" style={{background:'#fafafa'}}> <div className="conf-total"> <span className="conf-total-label">Total Pagado</span> <span className="conf-total-value" style={{color: '#22c55e'}}>{fmtMoney(currentTratamiento?.valor || 0)}</span> </div> </div> )} </div> ); 
    };

    if(bookingSuccess) { return ( <div className="web-shell"> <div className="web-content success-card"> <span className="success-icon-big">✓</span> <h1 className="web-title">¡Reserva Exitosa!</h1> <p className="web-subtitle">Hemos enviado el comprobante a<br/><strong>{form.email}</strong></p> <ReservaDetalleCard title="Comprobante de Pago" showTotal={true} /> <button className="btn-block-action" onClick={()=>window.location.href='/'}>Volver al Inicio</button> </div> </div> ) }

    return ( <div className="web-shell"> <header className="web-header">{step > 0 && <button className="web-back-btn" onClick={goBack}>‹</button>}<img src={LOGO_URL} alt="Logo" className="cisd-logo-web" /></header> <div className="stepper-container"><div className="stepper"><div className={`step-dot ${step >= 0 ? 'active' : ''}`}></div><div className={`step-line ${step >= 1 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div><div className={`step-line ${step >= 2 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div><div className={`step-line ${step >= 3 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div></div></div> <div className="web-content"> {step === 0 && ( <> <div><h2 className="web-title">Bienvenido</h2><p className="web-subtitle">Agenda tu hora médica.</p></div><div className="input-group"><label className="web-label">RUT</label><input className="web-input" placeholder="Ej: 12.345.678-9" value={form.rut} onChange={e=>setForm({...form, rut: formatRut(e.target.value)})} maxLength={12} autoFocus /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.rut || loading} onClick={handleRutSearch}>{loading ? 'Cargando...' : 'Comenzar'}</button></div> </> )} {step === 1 && ( <> <h2 className="web-title">Datos Personales</h2><div className="input-group"><label className="web-label">Nombre</label><input className="web-input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} /></div><div className="input-group"><label className="web-label">Email</label><input className="web-input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} /></div><div className="input-group"><label className="web-label">Teléfono</label><input className="web-input" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.nombre || !validateEmail(form.email)} onClick={()=>setStep(2)}>Guardar Datos</button></div> </> )} {step === 2 && ( <> <h2 className="web-title">¿Qué necesitas?</h2> <div className="input-group"><label className="web-label">Categoría</label><select className="web-select" value={form.categoria} onChange={e=>setForm({...form, categoria:e.target.value, especialidad:'', tratamientoId:''})}><option value="">Selecciona...</option>{categorias.map(c=><option key={c} value={c}>{c}</option>)}</select></div> <div className="input-group"><label className="web-label">Especialidad</label><select className="web-select" disabled={!form.categoria} value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value, tratamientoId:''})}><option value="">Selecciona...</option>{especialidadesFiltradas.map(e=><option key={e} value={e}>{e}</option>)}</select></div> <div className="input-group"><label className="web-label">Tratamiento</label><select className="web-select" disabled={!form.especialidad} value={form.tratamientoId} onChange={e=>setForm({...form, tratamientoId:e.target.value})}><option value="">Selecciona...</option>{prestacionesFiltradas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div> <div className="bottom-bar"><button className="btn-block-action" disabled={!form.tratamientoId || loading} onClick={handleTreatmentConfirm}>{loading ? 'Buscando...' : 'Buscar Horas'}</button></div> </> )} {step === 3 && ( <> <h2 className="web-title">Elige tu Hora</h2><div className="rs-date-tabs">{availableDates.map(dateStr => { const dateObj = parseDate(dateStr + 'T00:00:00'); return ( <div key={dateStr} className={`rs-date-tab ${selectedDateKey === dateStr ? 'selected' : ''}`} onClick={() => setSelectedDateKey(dateStr)}><div className="rs-day-name">{dateObj.toLocaleDateString('es-CL', {weekday: 'short', timeZone: 'UTC'})}</div><div className="rs-day-number">{dateObj.getUTCDate()}</div></div> ); })}</div><div className="rs-pro-list">{multiAgenda[selectedDateKey]?.map((entry) => ( <div key={entry.profesional.id} className="rs-pro-card"><div className="rs-pro-header"><div className="rs-avatar-circle">{entry.profesional.nombreCompleto.charAt(0)}</div><div className="rs-pro-details"><strong>{entry.profesional.nombreCompleto}</strong><span>{entry.profesional.especialidad}</span></div></div><div className="rs-slots-grid">{entry.slots.sort((a,b)=>parseDate(a.fecha)-parseDate(b.fecha)).map(slot => ( <button key={slot.id} className="rs-slot-btn" onClick={() => selectSlot(entry.profesional.id, slot.id)}>{fmtTime(slot.fecha)}</button> ))}</div></div> ))}</div> </> )} {step === 4 && ( <> <h2 className="web-title">Confirmar Reserva</h2><ReservaDetalleCard title="Resumen" showTotal={true} /><div className="bottom-bar"><button className="btn-block-action" disabled={loading} onClick={initPaymentProcess}>{loading ? 'Iniciando Pago...' : 'Ir a Pagar'}</button></div> </> )} </div> {showPayModal && preferenceId && ( <Modal onClose={()=>setShowPayModal(false)} title="Finalizar Pago"> <div style={{padding: '10px 0'}}> <p style={{marginBottom: 20, textAlign: 'center', color: '#666'}}> Serás redirigido a Mercado Pago de forma segura. </p> <Wallet initialization={{ preferenceId: preferenceId }} /> </div> </Modal> )} </div> )
}

export default App;