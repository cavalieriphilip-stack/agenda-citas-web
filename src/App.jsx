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
    buscarPacientePorRut, updateProfesional, deleteProfesional, uploadFile
} from './api';

// Inicializar Mercado Pago
initMercadoPago('APP_USR-a5a67c3b-4b4b-44a1-b973-ff2fd82fe90a', { locale: 'es-CL' });

// 🔥 VARIABLE GLOBAL
const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

// ==========================================
// 🛠️ HELPERS & UTILS
// ==========================================

const fmtMoney = (v) => `$${(v || 0).toLocaleString('es-CL')}`;

const parseDate = (iso) => {
    if (!iso) return new Date();
    if (iso.length === 10) return new Date(iso + 'T12:00:00Z');
    const clean = iso.endsWith('Z') ? iso : iso + 'Z';
    return new Date(clean);
};

const fmtDate = (iso) => iso ? parseDate(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', timeZone: 'UTC' }) : '-';
const fmtTime = (iso) => iso ? parseDate(iso).toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', timeZone: 'UTC' }) : '-';
const toDateKey = (iso) => iso ? iso.split('T')[0] : '';

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

const getCategoryFromSpecialty = (specName) => {
    const s = (specName || '').toLowerCase();
    if (s.includes('pack')) return 'Packs'; 
    if (s.includes('fonoaudiología') || s.includes('fonoaudiologia')) return 'Fonoaudiología';
    if (s.includes('psicología') || s.includes('psicologia')) return 'Psicología';
    if (s.includes('matrona')) return 'Matrona';
    if (s.includes('terapia')) return 'Terapia Ocupacional';
    return 'Otros';
};

const authHeader = () => {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };
};

// ==========================================
// 🧩 COMPONENTES UI GLOBALES
// ==========================================

function MultiSelectDropdown({ options, selectedValues, onChange, label, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const safeSelected = Array.isArray(selectedValues) ? selectedValues : [];

    useEffect(() => { 
        function handleClickOutside(event) { 
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); 
        } 
        document.addEventListener("mousedown", handleClickOutside); 
        return () => document.removeEventListener("mousedown", handleClickOutside); 
    }, []);

    return ( 
        <div className="dropdown-wrapper" ref={wrapperRef}> 
            <label className="form-label">{label}</label> 
            <div className="dropdown-header" onClick={() => !disabled && setIsOpen(!isOpen)} style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#f9fafb' : '#fff' }}> 
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
                {title && <h2 style={{marginTop:0, marginBottom:20, borderBottom:'1px solid #eee', paddingBottom:10}}>{title}</h2>}
                {children}
            </div>
        </div>, document.body
    );
}

// ==========================================
// 🚀 APP ROUTING PRINCIPAL
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
// 🔐 LAYOUT ADMINISTRATIVO
// ==========================================

function AdminLayout() {
    const [activeModule, setActiveModule] = useState('agenda');
    const [activeView, setActiveView] = useState('resumen');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    const token = localStorage.getItem('token');
    const isAdmin = user.rol === 'ADMIN';

    useEffect(() => { 
        if (!user.id || !token) navigate('/login'); 
    }, [navigate, user.id, token]);

    const handleModuleSwitch = (mod, view) => { setActiveModule(mod); setActiveView(view); setMobileMenuOpen(false); }
    
    return (
        <div className="dashboard-layout">
            <nav className="top-nav">
                <div className="brand-area">
                    <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
                    <img src={LOGO_URL} alt="Logo" className="cisd-logo-admin" />
                    <span className="admin-title-text">CISD {isAdmin ? 'Admin' : 'Profesional'}</span>
                </div>
                <div className="module-switcher desktop-view-only">
                    <button className={`module-tab ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => handleModuleSwitch('agenda', 'resumen')}>Clínica</button>
                    <button className={`module-tab ${activeModule === 'clientes' ? 'active' : ''}`} onClick={() => handleModuleSwitch('clientes', 'listado')}>Pacientes</button>
                    {isAdmin && <button className={`module-tab ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => handleModuleSwitch('finanzas', 'reporte')}>Finanzas</button>}
                </div>
                <div className="nav-actions">
                    <span className="desktop-view-only" style={{marginRight:10, fontSize:'0.9rem', fontWeight:'600'}}>{user.nombre}</span>
                    <button onClick={() => {localStorage.removeItem('usuario'); localStorage.removeItem('token'); navigate('/login');}} className="btn-danger" style={{padding:'5px 15px', fontSize:'0.8rem'}}>Salir</button>
                </div>
            </nav>
            <div className="workspace">
                {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>}
                <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                    <div className="mobile-view-only" style={{marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #eee'}}>
                        <div className="sidebar-header">MÓDULOS</div>
                        <div className={`nav-item ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => handleModuleSwitch('agenda', 'resumen')}>🏥 Clínica</div>
                        <div className={`nav-item ${activeModule === 'clientes' ? 'active' : ''}`} onClick={() => handleModuleSwitch('clientes', 'listado')}>👥 Pacientes</div>
                        {isAdmin && <div className={`nav-item ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => handleModuleSwitch('finanzas', 'reporte')}>💰 Finanzas</div>}
                    </div>
                    <div className="sidebar-header">NAVEGACIÓN</div>
                    {activeModule === 'agenda' && ( 
                        <>
                            <div className={`nav-item ${activeView==='resumen'?'active':''}`} onClick={()=>setActiveView('resumen')}>Calendario</div>
                            <div className={`nav-item ${activeView==='reservas'?'active':''}`} onClick={()=>setActiveView('reservas')}>Nueva Reserva</div>
                            <div className={`nav-item ${activeView==='horarios'?'active':''}`} onClick={()=>setActiveView('horarios')}>Mis Horarios</div>
                            {isAdmin && (
                                <>
                                    <div className="sidebar-header" style={{marginTop:20}}>ADMINISTRACIÓN</div>
                                    <div className={`nav-item ${activeView==='profesionales'?'active':''}`} onClick={()=>setActiveView('profesionales')}>Profesionales</div>
                                    <div className={`nav-item ${activeView==='prestaciones'?'active':''}`} onClick={()=>setActiveView('prestaciones')}>Prestaciones</div>
                                </>
                            )}
                        </> 
                    )}
                    {activeModule === 'clientes' && <div className={`nav-item ${activeView==='listado'?'active':''}`} onClick={()=>setActiveView('listado')}>Directorio</div>}
                    {isAdmin && activeModule === 'finanzas' && <div className={`nav-item ${activeView==='reporte'?'active':''}`} onClick={()=>setActiveView('reporte')}>Ver Reportes</div>}
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
        } 
        else { 
            if (view === 'profesionales' || view === 'prestaciones') return <AgendaResumen reservas={reservas} tratamientos={tratamientos} reload={refreshData} user={user} isAdmin={isAdmin} />; 
        }
    }
    if (module === 'clientes') return <AgendaPacientes />;
    if (module === 'finanzas' && isAdmin) { 
        const total = reservas.reduce((acc, r) => acc + (r.valor || 0), 0); 
        return <FinanzasReporte total={total} count={reservas.length} reservas={reservas} />; 
    }
    return <div>Cargando...</div>;
}

// ==========================================
// 📅 AGENDA: CALENDARIO RESUMEN (DISEÑO SOBRIO)
// ==========================================

function AgendaResumen({reservas, tratamientos, reload, user, isAdmin}){
    const [pros, setPros] = useState([]); 
    const [filterPro, setFilterPro] = useState(isAdmin ? '' : user.id); 
    const [view, setView] = useState('week'); 
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Estados para Modificar Cita
    const [isEditing, setIsEditing] = useState(false);
    const [editProId, setEditProId] = useState('');
    const [editSlot, setEditSlot] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);

    useEffect(()=>{ getProfesionales().then(setPros) },[]);

    const handleNav = (dir) => { 
        const d = new Date(currentDate); 
        if(view === 'day') d.setDate(d.getDate() + dir); 
        if(view === 'week') d.setDate(d.getDate() + (dir*7)); 
        setCurrentDate(d); 
    };

    const getDays = () => { 
        const d = [], start = new Date(currentDate); 
        if(view==='day'){ d.push(new Date(start)); } 
        else if(view==='week'){ 
            const day = start.getDay(), diff = start.getDate() - day + (day===0?-6:1); 
            const mon = new Date(start.setDate(diff)); 
            for(let i=0;i<7;i++){ 
                const x = new Date(mon); x.setDate(mon.getDate()+i); d.push(x); 
            } 
        } 
        return d; 
    };

    const days = getDays(); 
    const activeFilter = isAdmin ? filterPro : user.id; 
    const filtered = reservas.filter(r => activeFilter ? r.profesionalId === parseInt(activeFilter) : true);
    
    // Al abrir el modal
    const handleEventClick = (r) => {
        setSelectedEvent(r);
        setIsEditing(false); // Siempre inicia en modo "Ver"
        setEditProId('');
        setEditSlot('');
        setAvailableSlots([]);
    };

    const deleteReserva = async(id) => { 
        if(confirm('¿Cancelar y eliminar esta cita?')){
            await cancelarReserva(id); reload(); setSelectedEvent(null);
        } 
    };

    // Funciones de Edición
    const startEditing = async () => {
        setIsEditing(true);
        setEditProId(selectedEvent.profesionalId.toString());
        await loadSlotsForPro(selectedEvent.profesionalId);
    };

    const loadSlotsForPro = async (pid) => {
        const slots = await getHorariosByProfesional(pid);
        // Mostrar solo slots futuros
        const futureSlots = Array.isArray(slots) ? slots.filter(s => new Date(s.fecha) > new Date()) : [];
        setAvailableSlots(futureSlots);
    };

    const handleProChange = async (e) => {
        const newPid = e.target.value;
        setEditProId(newPid);
        await loadSlotsForPro(newPid);
    };

    const saveChanges = async () => {
        if (!editSlot) return alert("Debes seleccionar un horario nuevo");
        try {
            await reagendarReserva(selectedEvent.id, editSlot, editProId);
            alert("Cita modificada exitosamente");
            setSelectedEvent(null);
            reload();
        } catch (error) {
            alert("Error al modificar cita");
        }
    };

    // 🔥 LOGICA CORREGIDA: Filtro flexible por ESPECIALIDAD
    const relevantPros = selectedEvent ? pros.filter(p => {
        const tratCurrent = tratamientos.find(t => t.nombre === selectedEvent.motivo);
        if (tratCurrent) {
            return p.especialidad && p.especialidad.includes(tratCurrent.especialidad);
        } else {
            return p.tratamientos && p.tratamientos.includes(selectedEvent.motivo);
        }
    }) : [];

    const mesActual = currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    return ( 
        <div style={{height:'100%', display:'flex', flexDirection:'column'}}> 
            <div className="page-header"><div className="page-title"><h1>Calendario</h1></div></div> 
            
            <div className="dashboard-controls"> 
                {isAdmin ? ( 
                    <select className="form-control" style={{maxWidth:250}} value={filterPro} onChange={e=>setFilterPro(e.target.value)}> 
                        <option value="">Todos</option> 
                        {pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)} 
                    </select> 
                ) : ( 
                    <div style={{padding:'10px', background:'#eee', borderRadius:'8px', fontWeight:'bold'}}>{user.nombre}</div> 
                )} 
                <div className="view-buttons-group"> 
                    <button className={`calendar-nav-btn ${view==='day'?'active':''}`} onClick={()=>setView('day')}>Día</button> 
                    <button className={`calendar-nav-btn ${view==='week'?'active':''}`} onClick={()=>setView('week')}>Semana</button> 
                </div> 
                <div className="cal-nav-group"> 
                    <button className="calendar-nav-btn" onClick={()=>handleNav(-1)}>‹</button> 
                    <span style={{textTransform:'uppercase', fontWeight:'bold', fontSize:'0.9rem'}}>{mesActual}</span> 
                    <button className="calendar-nav-btn" onClick={()=>handleNav(1)}>›</button> 
                </div> 
            </div> 

            <div className="calendar-grid-wrapper"> 
                <div className="cal-header-row" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}> 
                    <div className="cal-header-cell">Hora</div> 
                    {days.map((d, i)=><div key={i} className="cal-header-cell">{d.toLocaleDateString('es-CL',{weekday:'short', day:'numeric'})}</div>)} 
                </div> 
                <div className="calendar-body" style={{gridTemplateColumns: `60px repeat(${days.length}, 1fr)`}}> 
                    <div>{Array.from({length:13},(_,i)=>i+8).map(h=><div key={h} className="cal-time-label">{h}:00</div>)}</div> 
                    {days.map((d, i)=>( 
                        <div key={i} className="cal-day-col"> 
                            {filtered.filter(r=>{ 
                                const rd=parseDate(r.fecha); 
                                return rd.getDate()===d.getDate() && rd.getMonth()===d.getMonth(); 
                            }).map(r=>{ 
                                const st = parseDate(r.fecha);
                                // Calcular fin estimado si no existe, para dibujar bloque
                                const et = r.fechaFin ? parseDate(r.fechaFin) : new Date(st.getTime() + 45*60000);

                                const h = st.getUTCHours();
                                const m = st.getUTCMinutes();
                                const top = ((h-8)*60)+m; 
                                
                                // Altura en pixeles (1 min = 1 px aprox en este css grid)
                                let duration = (et.getTime() - st.getTime()) / 60000;
                                if (duration < 30) duration = 30; // Minimo visual

                                return ( 
                                    <div key={r.id} className={`cal-event ${r.estado === 'BLOQUEADA' ? 'evt-block' : 'evt-blue'}`} 
                                         style={{
                                             top, 
                                             height: duration, 
                                             background: r.estado === 'BLOQUEADA' ? '#fee2e2' : '#dbeafe', 
                                             borderLeft: r.estado === 'BLOQUEADA' ? '4px solid #ef4444' : '4px solid #3b82f6',
                                             color: r.estado === 'BLOQUEADA' ? '#991b1b' : '#1e3a8a',
                                             overflow: 'hidden',
                                             fontSize: '0.75rem',
                                             lineHeight: '1.1'
                                         }} 
                                         onClick={()=>handleEventClick(r)}> 
                                        <strong>{st.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'})}</strong> 
                                        <span style={{display:'block'}}>{r.estado === 'BLOQUEADA' ? '⛔ BLOQUEADO' : r.pacienteNombre}</span> 
                                    </div> 
                                ) 
                            })} 
                        </div> 
                    ))} 
                </div> 
            </div> 
            
            {/* MODAL DETALLE DE CITA / EDICIÓN */}
            {selectedEvent && ( 
                <Modal title={isEditing ? "Modificar Cita" : "Detalle de la Sesión"} onClose={()=>setSelectedEvent(null)}> 
                    
                    {isEditing ? (
                        // VISTA DE EDICIÓN
                        <div style={{padding: 10}}>
                            <div className="input-group">
                                <label className="form-label">Profesional (Misma especialidad)</label>
                                <select className="form-control" value={editProId} onChange={handleProChange}>
                                    {relevantPros.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombreCompleto}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group" style={{marginTop: 15}}>
                                <label className="form-label">Nuevo Horario Disponible</label>
                                <select className="form-control" value={editSlot} onChange={e => setEditSlot(e.target.value)}>
                                    <option value="">Selecciona hora...</option>
                                    {availableSlots.map(s => (
                                        <option key={s.id} value={s.fecha}>
                                            {fmtDate(s.fecha)} - {fmtTime(s.fecha)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{marginTop: 20, display:'flex', gap:10, justifyContent:'flex-end'}}>
                                <button className="btn-edit" onClick={() => setIsEditing(false)}>Cancelar</button>
                                <button className="btn-primary" onClick={saveChanges}>Guardar Cambios</button>
                            </div>
                        </div>
                    ) : (
                        // VISTA DE DETALLE MEJORADA (PROFESIONAL Y SOBRIA)
                        <>
                            <div style={{marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                <div>
                                    <h2 style={{margin:0, fontSize:'1.4rem', color:'#1f2937'}}>{selectedEvent.estado === 'BLOQUEADA' ? 'BLOQUEO ADMINISTRATIVO' : selectedEvent.pacienteNombre}</h2>
                                    {selectedEvent.estado !== 'BLOQUEADA' && <div style={{color:'#6b7280', fontSize:'0.9rem', marginTop:4}}>RUT: {formatRut(selectedEvent.pacienteRut)}</div>}
                                </div>
                                <div style={{background: selectedEvent.estado === 'BLOQUEADA' ? '#fee2e2' : '#ecfdf5', color: selectedEvent.estado === 'BLOQUEADA' ? '#991b1b' : '#065f46', padding:'4px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:'600', border: selectedEvent.estado === 'BLOQUEADA' ? '1px solid #fecaca' : '1px solid #a7f3d0', textTransform:'uppercase'}}>
                                    {selectedEvent.estado === 'BLOQUEADA' ? 'BLOQUEADO' : 'CONFIRMADA'}
                                </div>
                            </div>

                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>
                                <div>
                                    <label style={{fontSize:'0.75rem', textTransform:'uppercase', color:'#9ca3af', fontWeight:'700', letterSpacing:'0.05em'}}>Fecha</label>
                                    <div style={{color:'#111827', fontWeight:'500'}}>{fmtDate(selectedEvent.fecha)}</div>
                                </div>
                                <div>
                                    <label style={{fontSize:'0.75rem', textTransform:'uppercase', color:'#9ca3af', fontWeight:'700', letterSpacing:'0.05em'}}>Hora</label>
                                    <div style={{color:'#111827', fontWeight:'500'}}>{fmtTime(selectedEvent.fecha)}</div>
                                </div>
                                <div>
                                    <label style={{fontSize:'0.75rem', textTransform:'uppercase', color:'#9ca3af', fontWeight:'700', letterSpacing:'0.05em'}}>Profesional</label>
                                    <div style={{color:'#111827', fontWeight:'500'}}>{selectedEvent.profesionalNombre}</div>
                                </div>
                                <div>
                                    <label style={{fontSize:'0.75rem', textTransform:'uppercase', color:'#9ca3af', fontWeight:'700', letterSpacing:'0.05em'}}>Tratamiento</label>
                                    <div style={{color:'#111827', fontWeight:'500'}}>{selectedEvent.motivo}</div>
                                </div>
                            </div>

                            {selectedEvent.estado !== 'BLOQUEADA' && (
                                <div style={{background:'#f9fafb', padding:15, borderRadius:8, border:'1px solid #f3f4f6', marginBottom:20}}>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                                        <span style={{color:'#6b7280', fontSize:'0.9rem'}}>Email:</span>
                                        <span style={{color:'#374151', fontWeight:'500'}}>{selectedEvent.pacienteEmail || '-'}</span>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                                        <span style={{color:'#6b7280', fontSize:'0.9rem'}}>Teléfono:</span>
                                        <span style={{color:'#374151', fontWeight:'500'}}>{selectedEvent.pacienteTelefono || '-'}</span>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #e5e7eb', paddingTop:8, marginTop:8}}>
                                        <span style={{color:'#6b7280', fontSize:'0.9rem'}}>Valor Pagado:</span>
                                        <span style={{color:'#059669', fontWeight:'700'}}>{fmtMoney(selectedEvent.valor || 0)}</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* BOTÓN DE VIDEOLLAMADA */}
                            {(selectedEvent.motivo.toLowerCase().includes('online') || selectedEvent.motivo.toLowerCase().includes('teleconsulta')) && selectedEvent.estado !== 'BLOQUEADA' && (
                                <div style={{marginBottom: 20}}>
                                    <a 
                                        href={`https://meet.jit.si/CISD-Reserva-${selectedEvent.id}#userInfo.displayName=${encodeURIComponent(user.nombre)}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        style={{
                                            display:'flex', justifyContent:'center', alignItems:'center', gap:8,
                                            background:'#2563eb', color:'white', textDecoration:'none', padding:'12px', 
                                            borderRadius:6, fontWeight:'600', transition:'background 0.2s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                                        onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                                    >
                                        <span>🎥</span> Conectarse a Videollamada
                                    </a>
                                </div>
                            )}

                            <div style={{display:'flex', gap:10, borderTop:'1px solid #eee', paddingTop:20}}> 
                                {selectedEvent.estado !== 'BLOQUEADA' && <button className="btn-edit" onClick={startEditing} style={{flex:1, justifyContent:'center'}}>Modificar Cita</button>}
                                <button className="btn-danger" onClick={()=>deleteReserva(selectedEvent.id)} style={{flex:1, justifyContent:'center', background:'#fee2e2', color:'#991b1b', border:'1px solid #fecaca'}}>{selectedEvent.estado === 'BLOQUEADA' ? 'Eliminar Bloqueo' : 'Cancelar Cita'}</button> 
                            </div> 
                        </>
                    )}
                </Modal> 
            )} 
        </div> 
    )
}

// ==========================================
// 📅 AGENDA: CONFIGURACIÓN DE HORARIOS (MEJORADA - TABS)
// ==========================================

function AgendaHorarios({ user, isAdmin }) {
    const [activeTab, setActiveTab] = useState('pattern');
    const [pros, setPros] = useState([]);
    const [rango, setRango] = useState({ inicio: new Date().toISOString().split('T')[0], fin: '' });
    const [configBase, setConfigBase] = useState({ duracionSlot: 45, intervalo: 0 }); // Nuevo campo intervalo
    const [profesionalSel, setProfesionalSel] = useState(isAdmin ? '' : user.id);
    const [loading, setLoading] = useState(false);
    
    // Bloqueo
    const [bloqueo, setBloqueo] = useState({ fecha: new Date().toISOString().split('T')[0], horaInicio: '', horaFin: '' });

    // Estado del Patrón Semanal Simplificado
    const [patron, setPatron] = useState({
        1: { id: 1, label: 'Lunes', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' },
        2: { id: 2, label: 'Martes', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' },
        3: { id: 3, label: 'Miércoles', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' },
        4: { id: 4, label: 'Jueves', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' },
        5: { id: 5, label: 'Viernes', activo: true, horaInicio: '09:00', horaFin: '17:00', breakInicio: '', breakFin: '' },
        6: { id: 6, label: 'Sábado', activo: false, horaInicio: '10:00', horaFin: '13:00', breakInicio: '', breakFin: '' }, 
        7: { id: 7, label: 'Domingo', activo: false, horaInicio: '', horaFin: '', breakInicio: '', breakFin: '' },
    });

    // Listas para ver activos
    const [misConfigs, setMisConfigs] = useState([]);
    const [misBloqueos, setMisBloqueos] = useState([]);

    useEffect(() => { 
        getProfesionales().then(setPros);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const configs = await getConfiguraciones();
            setMisConfigs(Array.isArray(configs) ? configs : []);
            
            const reservas = await getReservasDetalle();
            if(Array.isArray(reservas)) {
                setMisBloqueos(reservas.filter(r => r.estado === 'BLOQUEADA'));
            }
        } catch(e) {}
    }

    const handlePatronChange = (diaId, field, value) => {
        setPatron(prev => ({
            ...prev,
            [diaId]: { ...prev[diaId], [field]: value }
        }));
    };

    const toggleDia = (diaId) => {
        setPatron(prev => ({
            ...prev,
            [diaId]: { ...prev[diaId], activo: !prev[diaId].activo }
        }));
    };

    const generarHorarioMasivo = async () => {
        if (!profesionalSel) return alert("Selecciona un profesional");
        if (!rango.inicio || !rango.fin) return alert("Selecciona fecha inicio y fin");
        if (new Date(rango.fin) < new Date(rango.inicio)) return alert("La fecha fin debe ser mayor a la de inicio");

        if (!confirm(`⚠️ SE CREARÁN LOS HORARIOS\n\nDesde: ${rango.inicio}\nHasta: ${rango.fin}\n\nSi ya existen horarios, se reemplazarán.`)) return;

        setLoading(true);
        try {
            const payload = {
                profesionalId: profesionalSel,
                fechaInicio: rango.inicio,
                fechaFin: rango.fin,
                duracionSlot: configBase.duracionSlot,
                intervalo: configBase.intervalo,
                patronSemanal: patron
            };

            const response = await fetch(`${API_BASE_URL}/configuracion/masiva`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Éxito: ${data.message}`);
                loadData();
            } else {
                alert("❌ Error al generar horarios");
            }
        } catch (error) {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const crearBloqueo = async () => {
        if (!profesionalSel) return alert("Selecciona un profesional");
        if (!bloqueo.fecha || !bloqueo.horaInicio || !bloqueo.horaFin) return alert("Completa todos los campos");
        
        setLoading(true);
        try {
            const payload = {
                profesionalId: profesionalSel,
                fecha: bloqueo.fecha,
                horaInicio: bloqueo.horaInicio,
                horaFin: bloqueo.horaFin
            };
            
            const response = await fetch(`${API_BASE_URL}/configuracion/bloquear`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(payload)
            });

            if(response.ok) {
                alert(`🚫 Bloqueo creado para el día ${bloqueo.fecha}`);
                setBloqueo({ ...bloqueo, horaInicio: '', horaFin: '' });
                loadData();
            } else {
                alert("Error al bloquear");
            }
        } catch(e) {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    }

    const borrarConfig = async (id) => {
        if(confirm("¿Eliminar esta configuración diaria?")) {
            await deleteConfiguracion(id);
            loadData();
        }
    }

    const borrarBloqueo = async (id) => {
        if(confirm("¿Eliminar este bloqueo?")) {
            await cancelarReserva(id); // Reutilizamos cancelar reserva pues es una reserva BLOQUEADA
            loadData();
        }
    }

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestor de Disponibilidad</h1></div></div>

            <div className="pro-card" style={{ maxWidth: 1000, margin: '0 auto' }}>
                
                {/* TABS DE NAVEGACIÓN */}
                <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: 20 }}>
                    <button 
                        onClick={() => setActiveTab('pattern')}
                        style={{ padding: '10px 20px', background: activeTab === 'pattern' ? '#eee' : 'transparent', border: 'none', borderBottom: activeTab === 'pattern' ? '3px solid #000' : 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        📅 Generador Semanal
                    </button>
                    <button 
                        onClick={() => setActiveTab('block')}
                        style={{ padding: '10px 20px', background: activeTab === 'block' ? '#fee2e2' : 'transparent', border: 'none', borderBottom: activeTab === 'block' ? '3px solid #dc2626' : 'none', fontWeight: 'bold', cursor: 'pointer', color: activeTab === 'block' ? '#991b1b' : '#666' }}
                    >
                        🚫 Bloqueo de Horas
                    </button>
                    <button 
                        onClick={() => setActiveTab('list')}
                        style={{ padding: '10px 20px', background: activeTab === 'list' ? '#e0f2fe' : 'transparent', border: 'none', borderBottom: activeTab === 'list' ? '3px solid #0284c7' : 'none', fontWeight: 'bold', cursor: 'pointer', color: activeTab === 'list' ? '#0369a1' : '#666' }}
                    >
                        📋 Ver Activos
                    </button>
                </div>

                {/* SELECTOR DE PROFESIONAL */}
                <div style={{ marginBottom: 20 }}>
                    <label className="form-label">Profesional a Configurar</label>
                    {isAdmin ? (
                        <select className="form-control" value={profesionalSel} onChange={e => setProfesionalSel(e.target.value)}>
                            <option value="">Seleccionar...</option>
                            {pros.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}
                        </select>
                    ) : (
                        <input className="form-control" value={user.nombre} disabled />
                    )}
                </div>

                {/* TAB 1: PATRÓN SEMANAL */}
                {activeTab === 'pattern' && (
                    <div style={{animation: 'fadeIn 0.3s'}}>
                        <div style={{ background: '#f3f4f6', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                            <div className="input-row">
                                <div>
                                    <label className="form-label">Duración Atención (Min)</label>
                                    <select className="form-control" value={configBase.duracionSlot} onChange={e => setConfigBase({ ...configBase, duracionSlot: e.target.value })}>
                                        <option value="15">15 Min</option>
                                        <option value="30">30 Min</option>
                                        <option value="45">45 Min (Estándar)</option>
                                        <option value="60">60 Min</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Tiempo entre sesiones (Min)</label>
                                    <input type="number" className="form-control" value={configBase.intervalo} onChange={e => setConfigBase({ ...configBase, intervalo: e.target.value })} placeholder="Ej: 10" />
                                </div>
                            </div>
                            <div className="input-row">
                                <div><label className="form-label">Desde</label><input type="date" className="form-control" value={rango.inicio} onChange={e => setRango({ ...rango, inicio: e.target.value })} /></div>
                                <div><label className="form-label">Hasta (Inclusive)</label><input type="date" className="form-control" value={rango.fin} onChange={e => setRango({ ...rango, fin: e.target.value })} /></div>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: '#111827', color: 'white' }}>
                                        <th style={{ width: 50 }}>Activo</th>
                                        <th style={{ width: 100 }}>Día</th>
                                        <th>Horario Entrada</th>
                                        <th>Horario Salida</th>
                                        <th style={{background:'#374151'}}>Inicio Almuerzo (Opcional)</th>
                                        <th style={{background:'#374151'}}>Fin Almuerzo (Opcional)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(patron).map(dia => (
                                        <tr key={dia.id} style={{ background: dia.activo ? '#fff' : '#f9fafb', opacity: dia.activo ? 1 : 0.5 }}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input type="checkbox" checked={dia.activo} onChange={() => toggleDia(dia.id)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                                            </td>
                                            <td><strong>{dia.label}</strong></td>
                                            <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.horaInicio} onChange={e => handlePatronChange(dia.id, 'horaInicio', e.target.value)} /></td>
                                            <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.horaFin} onChange={e => handlePatronChange(dia.id, 'horaFin', e.target.value)} /></td>
                                            <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.breakInicio} onChange={e => handlePatronChange(dia.id, 'breakInicio', e.target.value)} style={{ borderColor: '#e5e7eb' }} /></td>
                                            <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.breakFin} onChange={e => handlePatronChange(dia.id, 'breakFin', e.target.value)} style={{ borderColor: '#e5e7eb' }} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: 25, textAlign: 'right' }}>
                            <button className="btn-primary" style={{ padding: '15px 30px', fontSize: '1rem', opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={generarHorarioMasivo}>
                                {loading ? 'Generando...' : '🚀 Crear Disponibilidad'}
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 2: BLOQUEAR */}
                {activeTab === 'block' && (
                    <div style={{animation: 'fadeIn 0.3s', padding: 20, border: '2px dashed #fca5a5', borderRadius: 10, background: '#fef2f2'}}>
                        <h3 style={{color: '#991b1b', marginTop:0}}>Bloqueo de Horas Específico</h3>
                        <p style={{marginBottom: 20, color:'#666'}}>Crea un bloqueo administrativo para que nadie pueda agendar en este horario.</p>
                        
                        <div className="input-row">
                            <div><label className="form-label">Fecha del Bloqueo</label><input type="date" className="form-control" value={bloqueo.fecha} onChange={e => setBloqueo({ ...bloqueo, fecha: e.target.value })} /></div>
                        </div>
                        <div className="input-row">
                            <div><label className="form-label">Desde las</label><input type="time" className="form-control" value={bloqueo.horaInicio} onChange={e => setBloqueo({ ...bloqueo, horaInicio: e.target.value })} /></div>
                            <div><label className="form-label">Hasta las</label><input type="time" className="form-control" value={bloqueo.horaFin} onChange={e => setBloqueo({ ...bloqueo, horaFin: e.target.value })} /></div>
                        </div>

                        <div style={{ marginTop: 25, textAlign: 'right' }}>
                            <button className="btn-danger" style={{ padding: '15px 30px', fontSize: '1rem', opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={crearBloqueo}>
                                {loading ? 'Procesando...' : '⛔ Bloquear Horario'}
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 3: VER ACTIVOS */}
                {activeTab === 'list' && (
                    <div style={{animation: 'fadeIn 0.3s'}}>
                        <h3>Configuraciones de Disponibilidad</h3>
                        <div className="data-table-container" style={{maxHeight: 300, overflowY:'auto', marginBottom:30}}>
                            <table className="data-table">
                                <thead><tr><th>Fecha</th><th>Horario</th><th>Acción</th></tr></thead>
                                <tbody>
                                    {misConfigs.filter(c => !profesionalSel || c.profesionalId == profesionalSel).map(c => (
                                        <tr key={c.id}>
                                            <td>{fmtDate(c.fecha)}</td>
                                            <td>{c.horaInicio} - {c.horaFin}</td>
                                            <td><button className="btn-danger" onClick={()=>borrarConfig(c.id)}>Eliminar</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3 style={{color:'#991b1b'}}>Bloqueos Activos</h3>
                        <div className="data-table-container" style={{maxHeight: 300, overflowY:'auto'}}>
                            <table className="data-table">
                                <thead><tr><th>Fecha</th><th>Bloqueo</th><th>Acción</th></tr></thead>
                                <tbody>
                                    {misBloqueos.filter(b => !profesionalSel || b.profesionalId == profesionalSel).map(b => (
                                        <tr key={b.id} style={{background:'#fff1f2'}}>
                                            <td>{fmtDate(b.fecha)}</td>
                                            <td>{fmtTime(b.fecha)} - {fmtTime(b.fechaFin)}</td>
                                            <td><button className="btn-danger" onClick={()=>borrarBloqueo(b.id)}>Desbloquear</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// ==========================================
// 👥 GESTIÓN DE PACIENTES (PERFIL 360)
// ==========================================

function AgendaPacientes(){
    const [pacientes,setPacientes]=useState([]); 
    const [viewingPatient, setViewingPatient] = useState(null); 
    const [editingId, setEditingId] = useState(null); 
    const [form,setForm]=useState({nombreCompleto:'',email:'',telefono:'', rut:''});
    
    useEffect(()=>{ load() },[]); 
    const load=()=>getPacientes().then(setPacientes);
    
    const handleEdit = (p) => { setForm({ nombreCompleto: p.nombreCompleto, email: p.email, telefono: p.telefono, rut: formatRut(p.rut||'') }); setEditingId(p.id); setViewingPatient(null); };
    
    const save=async(e)=>{ 
        e.preventDefault(); 
        if (!validateRut(form.rut)) { alert("RUT inválido"); return; } 
        try { 
            if(editingId) { await updatePaciente(editingId, form); alert('Actualizado'); setEditingId(null); } 
            else { await crearPaciente(form); alert('Creado'); } 
            setForm({nombreCompleto:'',email:'',telefono:'', rut:''}); load(); 
        } catch(e) { alert("Error"); } 
    };
    
    const handleDelete = async (id) => { if(confirm('¿Seguro?')) { await deletePaciente(id); load(); } };
    
    if (viewingPatient) return <PerfilPaciente paciente={viewingPatient} onBack={() => setViewingPatient(null)} />;
    
    return( 
        <div> 
            <div className="page-header"><div className="page-title"><h1>Directorio de Pacientes</h1></div></div> 
            <div className="pro-card"> 
                <h3 style={{marginTop:0}}>{editingId ? 'Editar Paciente' : 'Nuevo Paciente'}</h3> 
                <form onSubmit={save}> 
                    <div className="input-row"><div><label className="form-label">RUT</label><input className="form-control" value={form.rut} onChange={e=>setForm({...form, rut:formatRut(e.target.value)})} /></div><div><label className="form-label">Nombre</label><input className="form-control" value={form.nombreCompleto} onChange={e=>setForm({...form,nombreCompleto:e.target.value})}/></div></div> 
                    <div className="input-row"><div><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><label className="form-label">Teléfono</label><input className="form-control" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></div></div> 
                    <div style={{display:'flex', gap:10}}> <button className="btn-primary">Guardar</button> {editingId && <button type="button" className="btn-edit" onClick={()=>{setEditingId(null); setForm({nombreCompleto:'',email:'',telefono:'', rut:''})}}>Cancelar Edición</button>} </div>
                </form> 
            </div> 
            <div className="pro-card"> 
                <div className="data-table-container"> 
                    <table className="data-table"> 
                        <thead><tr><th>RUT</th><th>Nombre</th><th>Email</th><th>Opciones</th></tr></thead> 
                        <tbody>{pacientes.map(p=>( <tr key={p.id}> <td>{formatRut(p.rut)}</td> <td><strong>{p.nombreCompleto}</strong></td> <td>{p.email}</td> <td> <div style={{display:'flex', gap:5}}> <button className="btn-primary" style={{padding:'5px 10px', fontSize:'0.8rem', background:'#111827'}} onClick={()=>setViewingPatient(p)}>👁️ Ver Perfil</button> <button className="btn-edit" onClick={()=>handleEdit(p)}>✏️</button> <button className="btn-danger" onClick={()=>handleDelete(p.id)}>🗑️</button> </div> </td> </tr> ))}</tbody> 
                    </table> 
                </div> 
            </div> 
        </div> 
    )
}

function PerfilPaciente({ paciente, onBack }) {
    const [activeTab, setActiveTab] = useState('datos'); 
    const [historial, setHistorial] = useState([]);
    
    useEffect(() => { fetch(`${API_BASE_URL}/pacientes/${paciente.id}/historial`, { headers: authHeader() }).then(r => r.json()).then(data => setHistorial(Array.isArray(data) ? data : [])); }, [paciente.id]);
    
    const totalPagado = historial.reduce((acc, curr) => acc + (curr.estado === 'CONFIRMADA' ? 20000 : 0), 0);
    
    return ( 
        <div style={{animation: 'fadeIn 0.3s'}}> 
            <div style={{display:'flex', alignItems:'center', gap:15, marginBottom:20}}> 
                <button className="btn-edit" onClick={onBack}>← Volver al listado</button> 
                <h1 style={{margin:0, fontSize:'1.5rem'}}>{paciente.nombreCompleto}</h1> 
            </div> 
            
            <div className="tabs-header" style={{borderBottom:'2px solid #eee', marginBottom:20, display:'flex', gap:20}}> 
                <div className={`tab-item ${activeTab==='datos'?'active-tab':''}`} onClick={()=>setActiveTab('datos')} style={{padding:'10px 0', cursor:'pointer', fontWeight: activeTab==='datos'?700:400, borderBottom: activeTab==='datos'?'2px solid #000':'none', marginBottom:-2}}>Datos Personales</div> 
                <div className={`tab-item ${activeTab==='historial'?'active-tab':''}`} onClick={()=>setActiveTab('historial')} style={{padding:'10px 0', cursor:'pointer', fontWeight: activeTab==='historial'?700:400, borderBottom: activeTab==='historial'?'2px solid #000':'none', marginBottom:-2}}>Historial de Citas</div> 
                <div className={`tab-item ${activeTab==='ficha'?'active-tab':''}`} onClick={()=>setActiveTab('ficha')} style={{padding:'10px 0', cursor:'pointer', fontWeight: activeTab==='ficha'?700:400, borderBottom: activeTab==='ficha'?'2px solid #000':'none', marginBottom:-2}}>Ficha Clínica</div> 
            </div> 
            
            {activeTab === 'datos' && ( 
                <div className="pro-card"> 
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}> 
                        <div><div className="mobile-label">RUT</div><div style={{fontSize:'1.1rem'}}>{formatRut(paciente.rut)}</div></div> 
                        <div><div className="mobile-label">Email</div><div style={{fontSize:'1.1rem'}}>{paciente.email}</div></div> 
                        <div><div className="mobile-label">Teléfono</div><div style={{fontSize:'1.1rem'}}>{paciente.telefono}</div></div> 
                        <div><div className="mobile-label">Inversión Total (Est.)</div><div style={{fontSize:'1.1rem', fontWeight:'bold', color:'#059669'}}>{fmtMoney(totalPagado)}</div></div> 
                    </div> 
                </div> 
            )} 
            
            {activeTab === 'historial' && ( 
                <div className="pro-card"> 
                    <h3 style={{marginTop:0}}>Citas Agendadas</h3> 
                    <table className="data-table"> 
                        <thead><tr><th>Fecha</th><th>Profesional</th><th>Tratamiento</th><th>Estado</th><th>Valor</th></tr></thead> 
                        <tbody> {historial.map(h => ( <tr key={h.id}> <td>{fmtDate(h.fechaHoraInicio)} {fmtTime(h.fechaHoraInicio)}</td> <td>{h.profesional?.nombreCompleto}</td> <td>{h.motivoConsulta}</td> <td><span style={{padding:'2px 8px', borderRadius:4, background: h.estado==='CONFIRMADA'?'#d1fae5':'#fee2e2', color: h.estado==='CONFIRMADA'?'#065f46':'#991b1b', fontSize:'0.85rem', fontWeight:'bold'}}>{h.estado}</span></td> <td>{fmtMoney(h.estado==='CONFIRMADA' ? 20000 : 0)}</td> </tr> ))} {historial.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', color:'#666'}}>Sin historial disponible</td></tr>} </tbody> 
                    </table> 
                </div> 
            )} 
            
            {activeTab === 'ficha' && <FichaClinicaViewer paciente={paciente} onClose={onBack} />} 
        </div> 
    );
}

function FichaClinicaViewer({ paciente, onClose }) {
    const [fichas, setFichas] = useState([]); 
    const [modoNueva, setModoNueva] = useState(false); 
    const [subiendo, setSubiendo] = useState(false); 
    const fileInputRef = useRef(null); 
    const [nuevaFicha, setNuevaFicha] = useState({ tipo: 'Evaluación Inicial', campos: [{ titulo: 'Observaciones', valor: '' }] }); 
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    useEffect(() => { loadFichas(); }, []); 
    
    const loadFichas = async () => { try { const res = await fetch(`${API_BASE_URL}/pacientes/${paciente.id}/fichas`, { headers: authHeader() }); if (res.ok) setFichas(await res.json()); } catch (e) { console.error(e); } };
    const agregarCampo = () => setNuevaFicha({ ...nuevaFicha, campos: [...nuevaFicha.campos, { titulo: '', valor: '' }] });
    const handleCampoChange = (index, key, value) => { const n = [...nuevaFicha.campos]; n[index][key] = value; setNuevaFicha({ ...nuevaFicha, campos: n }); };
    
    const handleFileSelect = async (e) => { 
        const file = e.target.files[0]; if (!file) return; setSubiendo(true); 
        try { const data = await uploadFile(file); setNuevaFicha(prev => ({ ...prev, campos: [...prev.campos, { titulo: 'Archivo Adjunto', valor: data.url, esArchivo: true }] })); } catch (error) { alert("Error al subir"); } finally { setSubiendo(false); } 
    };
    
    const guardarFicha = async () => { try { const res = await fetch(`${API_BASE_URL}/fichas`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ pacienteId: paciente.id, profesionalId: user.id, tipo: nuevaFicha.tipo, contenido: nuevaFicha.campos }) }); if (res.ok) { alert("Guardada"); setModoNueva(false); loadFichas(); } else alert("Error"); } catch (e) { alert("Error conexión"); } };
    
    const renderValor = (campo) => { 
        const val = (campo.valor || '').toString(); 
        const valLower = val.toLowerCase(); 
        const esPdf = valLower.includes('.pdf'); 
        const esImagen = !esPdf && (valLower.match(/\.(jpeg|jpg|gif|png|webp)$/) != null || valLower.includes('cloudinary')); 
        if (campo.esArchivo && esPdf) return <div style={{background: '#fef2f2', padding: 10, borderRadius: 6, border: '1px solid #fee2e2', marginTop:5}}><a href={val} target="_blank" rel="noreferrer" style={{color: '#dc2626'}}>📄 Ver PDF Adjunto</a></div>; 
        if (campo.esArchivo || esImagen) return <div style={{marginTop:5}}><img src={val} alt="Adjunto" style={{maxWidth: '100%', maxHeight: '200px', borderRadius: '8px'}} /><br/><a href={val} target="_blank" rel="noreferrer" style={{fontSize:'0.8rem'}}>Ver grande</a></div>; 
        return <div style={{ whiteSpace: 'pre-wrap', color: '#4b5563', background: '#f9fafb', padding: 10, borderRadius: 8, marginTop: 5 }}>{val || '-'}</div>; 
    };
    
    return ( 
        <div> 
            {modoNueva ? ( 
                <div className="pro-card" style={{ borderLeft: '5px solid #000' }}> 
                    <h3>Nueva Entrada</h3> 
                    <select className="form-control" value={nuevaFicha.tipo} onChange={e => setNuevaFicha({ ...nuevaFicha, tipo: e.target.value })}><option>Evaluación Inicial</option><option>Sesión Tratamiento</option><option>Evolución</option><option>Informe</option></select> 
                    <div style={{ marginTop: 20 }}> 
                        {nuevaFicha.campos.map((campo, idx) => ( <div key={idx} style={{marginBottom:10}}> <input className="form-control" placeholder="Título" value={campo.titulo} onChange={e => handleCampoChange(idx, 'titulo', e.target.value)} style={{ fontWeight: 'bold', marginBottom: 5, background: '#f9fafb' }} /> {campo.esArchivo ? renderValor(campo) : <textarea className="form-control" placeholder="Texto..." value={campo.valor} onChange={e => handleCampoChange(idx, 'valor', e.target.value)} rows={3} />} </div> ))} 
                        <button className="btn-edit" onClick={agregarCampo} style={{marginRight:10}}>+ Texto</button> 
                        <button className="btn-edit" onClick={() => fileInputRef.current.click()} disabled={subiendo}>{subiendo?'Subiendo...':'📎 Adjuntar'}</button> 
                        <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={handleFileSelect} accept="image/*,application/pdf" /> 
                    </div> 
                    <div style={{ marginTop: 20, textAlign:'right' }}> 
                        <button className="btn-edit" onClick={() => setModoNueva(false)} style={{marginRight:10}}>Cancelar</button> <button className="btn-primary" onClick={guardarFicha}>Guardar</button> 
                    </div> 
                </div> 
            ) : ( 
                <button className="btn-primary" style={{ marginBottom: 20, width: '100%' }} onClick={() => setModoNueva(true)}>+ Nueva Evolución / Documento</button> 
            )} 
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}> 
                {fichas.map(ficha => ( 
                    <div key={ficha.id} className="pro-card"> 
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}> 
                            <div><strong>{ficha.tipo}</strong><br/><small>{new Date(ficha.fecha).toLocaleString()}</small></div> 
                            <small>{ficha.profesional?.nombreCompleto}</small> 
                        </div> 
                        <div> {Array.isArray(ficha.contenido) ? ficha.contenido.map((c, i) => <div key={i} style={{marginBottom:10}}><strong>{c.titulo}</strong>{renderValor(c)}</div>) : JSON.stringify(ficha.contenido)} </div> 
                    </div> 
                ))} 
            </div> 
        </div> 
    );
}

// ==========================================
// 📅 AGENDA: NUEVA RESERVA MANUAL
// ==========================================

function AgendaNuevaReserva({ reload, reservas, tratamientos, user, isAdmin }) {
    const [pacientes, setPacientes] = useState([]); 
    const [pros, setPros] = useState([]); 
    const [horarios, setHorarios] = useState([]); 
    const [form, setForm] = useState({ pacienteId: '', profesionalId: isAdmin ? '' : user.id, horarioId: '', especialidad: '', tratamientoId: '' });
    
    useEffect(() => { getPacientes().then(setPacientes); getProfesionales().then(setPros); if (!isAdmin && user.id) { handlePro(user.id); } }, []);
    
    const especialidades = [...new Set(tratamientos.map(t => t.especialidad))]; 
    const prestaciones = tratamientos.filter(t => t.especialidad === form.especialidad); 
    const prosFiltrados = isAdmin ? (form.tratamientoId ? pros.filter(p => { const trat = tratamientos.find(x => x.id === parseInt(form.tratamientoId)); return trat && p.tratamientos && p.tratamientos.includes(trat.nombre); }) : []) : [user];
    
    const handlePro = async (pid) => { 
        setForm(prev => ({ ...prev, profesionalId: pid })); setHorarios([]); if (!pid) return; 
        try { const h = await getHorariosByProfesional(pid); if (Array.isArray(h)) setHorarios(h.filter(x => new Date(x.fecha) > new Date())); } catch(e) { setHorarios([]); } 
    };
    
    const save = async (e) => { 
        e.preventDefault(); 
        if (!form.tratamientoId) return alert("Faltan datos"); 
        const trat = tratamientos.find(t => t.id === parseInt(form.tratamientoId)); 
        try { await crearReserva({ pacienteId: parseInt(form.pacienteId), profesionalId: parseInt(form.profesionalId), horarioDisponibleId: form.horarioId, motivo: trat.nombre }); alert('Creada'); reload(); } catch (e) { alert('Error'); } 
    };
    
    return ( 
        <div> 
            <div className="page-header"><div className="page-title"><h1>Nueva Reserva Manual</h1></div></div> 
            <div className="pro-card"> 
                <form onSubmit={save}> 
                    <div className="input-row"> 
                        <div><label className="form-label">Especialidad</label><select className="form-control" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value, tratamientoId: '' })}><option>Seleccionar...</option>{especialidades.map(e => <option key={e} value={e}>{e}</option>)}</select></div> 
                        <div><label className="form-label">Tratamiento</label><select className="form-control" disabled={!form.especialidad} value={form.tratamientoId} onChange={e => setForm({ ...form, tratamientoId: e.target.value })}><option>Seleccionar...</option>{prestaciones.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div> 
                    </div> 
                    <div className="input-row"> 
                        <div><label className="form-label">Paciente</label><select className="form-control" value={form.pacienteId} onChange={e => setForm({ ...form, pacienteId: e.target.value })}><option>Seleccionar...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto} ({formatRut(p.rut)})</option>)}</select></div> 
                        <div> <label className="form-label">Profesional</label> {isAdmin ? ( <select className="form-control" disabled={!form.tratamientoId} value={form.profesionalId} onChange={e => handlePro(e.target.value)}><option>Seleccionar...</option>{prosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select> ) : ( <input className="form-control" value={user.nombre} disabled /> )} </div> 
                    </div> 
                    <div style={{ marginBottom: 20 }}> 
                        <label className="form-label">Horario</label> <select className="form-control" onChange={e => setForm({ ...form, horarioId: e.target.value })}><option>Seleccionar...</option>{Array.isArray(horarios) && horarios.map(h => <option key={h.id} value={h.id}>{fmtDate(h.fecha)} - {fmtTime(h.fecha)}</option>)}</select> 
                    </div> 
                    <button className="btn-primary">Crear Reserva</button> 
                </form> 
            </div> 
        </div> 
    );
}

// ==========================================
// 👔 GESTIÓN DE PROFESIONALES
// ==========================================

function AgendaProfesionales({ tratamientos }) {
    const [pros, setPros] = useState([]);
    const [form, setForm] = useState({ id: null, nombreCompleto: '', rut: '', email: '', especialidades: [], tratamientos: [] });
    const [isEditing, setIsEditing] = useState(false);
    
    const especialidadesUnicas = [...new Set(tratamientos.map(t => t.especialidad))].sort();
    const tratamientosDisponibles = tratamientos.filter(t => form.especialidades.includes(t.especialidad)).map(t => t.nombre).sort();

    useEffect(() => { getProfesionales().then(setPros) }, []);

    const handleSpecChange = (newSpecs) => {
        const tratamientosValidos = tratamientos.filter(t => newSpecs.includes(t.especialidad) && form.tratamientos.includes(t.nombre)).map(t => t.nombre);
        setForm({ ...form, especialidades: newSpecs, tratamientos: tratamientosValidos });
    };

    const save = async (e) => {
        e.preventDefault();
        const payload = {
            nombreCompleto: form.nombreCompleto,
            rut: form.rut,
            email: form.email,
            especialidad: form.especialidades.join(', '),
            tratamientos: form.tratamientos.join(', ')
        };
        try {
            if (isEditing) await updateProfesional(form.id, payload);
            else await fetch(`${API_BASE_URL}/profesionales`, { method: 'POST', headers: authHeader(), body: JSON.stringify(payload) });
            alert('Guardado');
            setIsEditing(false);
            setForm({ id: null, nombreCompleto: '', rut: '', email: '', especialidades: [], tratamientos: [] });
            getProfesionales().then(setPros);
        } catch (e) { alert("Error al guardar"); }
    };

    const handleEdit = (p) => {
        setForm({
            id: p.id,
            nombreCompleto: p.nombreCompleto,
            rut: formatRut(p.rut || ''),
            email: p.email || '',
            especialidades: p.especialidad ? p.especialidad.split(', ').map(s=>s.trim()) : [],
            tratamientos: p.tratamientos ? p.tratamientos.split(', ').map(s=>s.trim()) : []
        });
        setIsEditing(true);
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        if (confirm('¿Eliminar profesional?')) { await deleteProfesional(id); getProfesionales().then(setPros); }
    };

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Profesionales</h1></div></div>
            <div className="pro-card">
                <h3>{isEditing ? 'Editar Profesional' : 'Nuevo Profesional'}</h3>
                <form onSubmit={save}>
                    <div className="input-row">
                        <div style={{ flex: 2 }}>
                            <label className="form-label">Nombre Completo</label>
                            <input className="form-control" value={form.nombreCompleto} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} required />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">RUT</label>
                            <input className="form-control" value={form.rut} onChange={e => setForm({ ...form, rut: formatRut(e.target.value) })} placeholder="12.345.678-9" />
                        </div>
                    </div>
                    {/* CAMPO DE EMAIL */}
                    <div className="input-row">
                        <div style={{width: '100%'}}>
                            <label className="form-label">Email Notificaciones</label>
                            <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="medico@cisd.cl" />
                        </div>
                    </div>

                    <div className="input-row">
                        <div><MultiSelectDropdown label="1. Especialidades" options={especialidadesUnicas} selectedValues={form.especialidades} onChange={handleSpecChange} /></div>
                        <div><MultiSelectDropdown label="2. Prestaciones" options={tratamientosDisponibles} selectedValues={form.tratamientos} onChange={v => setForm({ ...form, tratamientos: v })} disabled={form.especialidades.length === 0} /></div>
                    </div>
                    <button className="btn-primary">Guardar</button>
                    {isEditing && <button type="button" className="btn-edit" onClick={() => { setIsEditing(false); setForm({ id: null, nombreCompleto: '', rut: '', email: '', especialidades: [], tratamientos: [] }); }} style={{marginLeft: 10}}>Cancelar</button>}
                </form>
            </div>
            <div className="pro-card">
                <div className="data-table-container">
                    <table className="data-table">
                        <thead><tr><th>Nombre</th><th>RUT</th><th>Email</th><th>Especialidad</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {pros.map(p => (
                                <tr key={p.id}>
                                    <td>{p.nombreCompleto}</td>
                                    <td>{formatRut(p.rut)}</td>
                                    <td>{p.email || '-'}</td>
                                    <td>{p.especialidad}</td>
                                    <td>
                                        <button className="btn-edit" onClick={() => handleEdit(p)}>Editar</button>
                                        <button className="btn-danger" onClick={() => handleDelete(p.id)}>X</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 💊 GESTIÓN DE PRESTACIONES
// ==========================================

function AgendaTratamientos({ reload }) {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '' });
    const [isEditing, setIsEditing] = useState(false);
    
    const load = () => fetch(`${API_BASE_URL}/tratamientos`).then(r => r.json()).then(setItems);
    useEffect(() => { load(); }, []);
    
    const save = async (e) => { 
        e.preventDefault(); 
        const method = isEditing ? 'PUT' : 'POST'; 
        const url = isEditing ? `${API_BASE_URL}/tratamientos/${form.id}` : `${API_BASE_URL}/tratamientos`; 
        await fetch(url, { method, headers: authHeader(), body: JSON.stringify(form) }); 
        setForm({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '' }); 
        setIsEditing(false); load(); if(reload) reload(); 
    };
    
    const handleEdit = (it) => { setForm(it); setIsEditing(true); window.scrollTo(0,0); };
    const handleDelete = async (id) => { if(confirm('¿Eliminar?')) { await fetch(`${API_BASE_URL}/tratamientos/${id}`, { method: 'DELETE', headers: authHeader() }); load(); } };
    
    return ( 
        <div> 
            <div className="page-header"><div className="page-title"><h1>Gestión de Prestaciones</h1></div></div> 
            <div className="pro-card"> 
                <h3>{isEditing ? 'Editar' : 'Nueva'}</h3> 
                <form onSubmit={save}> 
                    <div className="input-row"> 
                        <div><label className="form-label">Nombre del Tratamiento</label><input className="form-control" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required /></div> 
                        <div><label className="form-label">Especialidad (Pública)</label><input className="form-control" value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value})} required /></div> 
                    </div> 
                    <div className="input-row"> 
                        <div><label className="form-label">Código</label><input className="form-control" value={form.codigo} onChange={e=>setForm({...form, codigo:e.target.value})} /></div> 
                        <div><label className="form-label">Valor</label><input type="number" className="form-control" value={form.valor} onChange={e=>setForm({...form, valor:e.target.value})} required /></div> 
                    </div> 
                    <button className="btn-primary">Guardar</button> {isEditing && <button type="button" className="btn-edit" style={{marginLeft:10}} onClick={()=>{setIsEditing(false); setForm({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '' })}}>Cancelar</button>} 
                </form> 
            </div> 
            <div className="pro-card"> 
                <div className="data-table-container"> 
                    <table className="data-table"> <thead><tr><th>Código</th><th>Tratamiento</th><th>Especialidad</th><th>Valor</th><th>Acciones</th></tr></thead> <tbody> {items.map(it => ( <tr key={it.id}> <td>{it.codigo}</td> <td>{it.nombre}</td> <td>{it.especialidad}</td> <td>{fmtMoney(it.valor)}</td> <td> <button className="btn-edit" onClick={()=>handleEdit(it)}>Edit</button> <button className="btn-danger" onClick={()=>handleDelete(it.id)}>X</button> </td> </tr> ))} </tbody> </table> 
                </div> 
            </div> 
        </div> 
    );
}

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
                <div className="pro-card"> <h3>Atenciones por Profesional</h3> <div className="data-table-container"> <table className="finance-table"><thead><tr><th>Profesional</th><th>Citas</th></tr></thead><tbody>{Object.entries(statsPro).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table> </div> </div> 
                <div className="pro-card"> <h3>Agendas por Tratamiento</h3> <div className="data-table-container"> <table className="finance-table"><thead><tr><th>Tratamiento</th><th>Cantidad</th></tr></thead><tbody>{Object.entries(statsTrat).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table> </div> </div> 
            </div> 
        </div> 
    ) 
}

export default App;