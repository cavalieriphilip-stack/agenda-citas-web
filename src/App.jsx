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
// 🚀 COMPONENTES PRINCIPALES (Definidos antes de App para evitar ReferenceError)
// ==========================================

// 🔴 WEB PACIENTE (FRONTEND PÚBLICO)
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

    const handleRutSearch = async () => { 
        if(!form.rut) return alert("Ingrese RUT"); 
        if(!validateRut(form.rut)) return alert("RUT inválido"); 
        setLoading(true); 
        try { 
            const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); 
            const paciente = await buscarPacientePorRut(rutLimpio); 
            if (paciente) { 
                setPacienteId(paciente.id); 
                setForm(prev => ({...prev, nombre: paciente.nombreCompleto, email: paciente.email, telefono: paciente.telefono})); 
                setStep(2); 
            } else { setStep(1); } 
        } catch(e) { setStep(1); } 
        setLoading(false); 
    };
    
    const handleTreatmentConfirm = async () => { 
        setLoading(true); 
        if (prosAptos.length === 0) { alert("No hay profesionales disponibles para este tratamiento."); setLoading(false); return; } 
        
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
        
        if (sortedDates.length === 0) { alert("No hay horas disponibles próximamente."); setLoading(false); return; } 
        
        setMultiAgenda(agendaMap); 
        setAvailableDates(sortedDates); 
        if (sortedDates.length > 0) setSelectedDateKey(sortedDates[0]); 
        setLoading(false); 
        setStep(3); 
    };
    
    const selectSlot = (pid, fechaIso) => { 
        setForm(prev => ({ ...prev, profesionalId: pid, horarioId: fechaIso })); 
        setStep(4); 
    };

    const initPaymentProcess = async () => { 
        setLoading(true); 
        const storageData = { ...form, pacienteId: pacienteId }; 
        try { 
            let pid = pacienteId; 
            if (!pid) { 
                const rutLimpio = form.rut.replace(/[^0-9kK]/g, ''); 
                const pac = await crearPaciente({nombreCompleto:form.nombre, email:form.email, telefono:form.telefono, rut: rutLimpio}); 
                pid = pac.id; setPacienteId(pid); storageData.pacienteId = pid; 
            } 
            localStorage.setItem('pendingReservation', JSON.stringify(storageData)); 
            
            const response = await fetch(`${API_BASE_URL}/create_preference`, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ title: tratamientoSel.nombre, quantity: 1, unit_price: tratamientoSel.valor }), 
            }); 
            const preference = await response.json(); 
            
            if (preference.id) { setPreferenceId(preference.id); setShowPayModal(true); } 
            else { alert("Error al iniciar el pago"); } 
        } catch (error) { alert("Error de conexión"); } finally { setLoading(false); } 
    };
    
    const goBack = () => { if(step===0)return; if(step===2 && pacienteId) setStep(0); else setStep(step-1); };
    
    const ReservaDetalleCard = ({ title, showTotal }) => { 
        const slotDate = parseDate(form.horarioId || new Date().toISOString()); 
        const fechaStr = slotDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); 
        const horaStr = slotDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); 
        const currentTratamiento = tratamientos.find(t => t.id === parseInt(form.tratamientoId)); 
        let proName = "Asignado"; 
        
        if (form.profesionalId && profesionales.length > 0) { 
            const p = profesionales.find(pr => pr.id === parseInt(form.profesionalId)); 
            if (p) proName = p.nombreCompleto; 
        } else if (multiAgenda && selectedDateKey && multiAgenda[selectedDateKey]) { 
            const foundEntry = multiAgenda[selectedDateKey].find(e => e.profesional.id === form.profesionalId); 
            if (foundEntry) proName = foundEntry.profesional.nombreCompleto; 
        }
        
        return ( 
            <div className="conf-card"> 
                <div className="conf-section"> 
                    <div className="conf-title">Paciente</div> 
                    <div className="conf-row"><span className="conf-label">Nombre</span><span className="conf-value">{form.nombre}</span></div> 
                    <div className="conf-row"><span className="conf-label">RUT</span><span className="conf-value">{form.rut}</span></div> 
                </div> 
                <div className="conf-section"> 
                    <div className="conf-title">Servicio</div> 
                    <div className="conf-row"><span className="conf-label">Tratamiento</span><span className="conf-value">{currentTratamiento?.nombre}</span></div> 
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
                            <span className="conf-total-label">Total Pagado</span> 
                            <span className="conf-total-value" style={{color: '#22c55e'}}>{fmtMoney(currentTratamiento?.valor || 0)}</span> 
                        </div> 
                    </div> 
                )} 
            </div> 
        ); 
    };

    if(bookingSuccess) { return ( <div className="web-shell"> <div className="web-content success-card"> <span className="success-icon-big">✓</span> <h1 className="web-title">¡Reserva Exitosa!</h1> <p className="web-subtitle">Hemos enviado el comprobante a<br/><strong>{form.email}</strong></p> <ReservaDetalleCard title="Comprobante de Pago" showTotal={true} /> <button className="btn-block-action" onClick={()=>window.location.href='/'}>Volver al Inicio</button> </div> </div> ) }

    return ( 
        <div className="web-shell"> 
            <header className="web-header">{step > 0 && <button className="web-back-btn" onClick={goBack}>‹</button>}<img src={LOGO_URL} alt="Logo" className="cisd-logo-web" /></header> 
            <div className="stepper-container"><div className="stepper"><div className={`step-dot ${step >= 0 ? 'active' : ''}`}></div><div className={`step-line ${step >= 1 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div><div className={`step-line ${step >= 2 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div><div className={`step-line ${step >= 3 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div></div></div> 
            
            <div className="web-content"> 
                {step === 0 && ( <> <div><h2 className="web-title">Bienvenido</h2><p className="web-subtitle">Agenda tu hora médica.</p></div><div className="input-group"><label className="web-label">RUT</label><input className="web-input" placeholder="Ej: 12.345.678-9" value={form.rut} onChange={e=>setForm({...form, rut: formatRut(e.target.value)})} maxLength={12} autoFocus /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.rut || loading} onClick={handleRutSearch}>{loading ? 'Cargando...' : 'Comenzar'}</button></div> </> )} 
                {step === 1 && ( <> <h2 className="web-title">Datos Personales</h2><div className="input-group"><label className="web-label">Nombre</label><input className="web-input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} /></div><div className="input-group"><label className="web-label">Email</label><input className="web-input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} /></div><div className="input-group"><label className="web-label">Teléfono</label><input className="web-input" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.nombre || !validateEmail(form.email)} onClick={()=>setStep(2)}>Guardar Datos</button></div> </> )} 
                {step === 2 && ( <> <h2 className="web-title">¿Qué necesitas?</h2> <div className="input-group"><label className="web-label">Categoría</label><select className="web-select" value={form.categoria} onChange={e=>setForm({...form, categoria:e.target.value, especialidad:'', tratamientoId:''})}><option value="">Selecciona...</option>{categorias.map(c=><option key={c} value={c}>{c}</option>)}</select></div> <div className="input-group"><label className="web-label">Especialidad</label><select className="web-select" disabled={!form.categoria} value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value, tratamientoId:''})}><option value="">Selecciona...</option>{especialidadesFiltradas.map(e=><option key={e} value={e}>{e}</option>)}</select></div> <div className="input-group"><label className="web-label">Tratamiento</label><select className="web-select" disabled={!form.especialidad} value={form.tratamientoId} onChange={e=>setForm({...form, tratamientoId:e.target.value})}><option value="">Selecciona...</option>{prestacionesFiltradas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div> <div className="bottom-bar"><button className="btn-block-action" disabled={!form.tratamientoId || loading} onClick={handleTreatmentConfirm}>{loading ? 'Buscando...' : 'Buscar Horas'}</button></div> </> )} 
                {step === 3 && ( <> <h2 className="web-title">Elige tu Hora</h2><div className="rs-date-tabs">{availableDates.map(dateStr => { const dateObj = parseDate(dateStr + 'T00:00:00'); return ( <div key={dateStr} className={`rs-date-tab ${selectedDateKey === dateStr ? 'selected' : ''}`} onClick={() => setSelectedDateKey(dateStr)}><div className="rs-day-name">{dateObj.toLocaleDateString('es-CL', {weekday: 'short', timeZone: 'UTC'})}</div><div className="rs-day-number">{dateObj.getUTCDate()}</div></div> ); })}</div>
                {/* 🔥 CONTAINER CON SCROLL PARA MUCHAS HORAS */}
                <div className="rs-pro-list" style={{maxHeight:'400px', overflowY:'auto', paddingRight:'5px'}}>
                    {multiAgenda[selectedDateKey]?.map((entry) => ( <div key={entry.profesional.id} className="rs-pro-card"><div className="rs-pro-header"><div className="rs-avatar-circle">{entry.profesional.nombreCompleto.charAt(0)}</div><div className="rs-pro-details"><strong>{entry.profesional.nombreCompleto}</strong><span>{entry.profesional.especialidad}</span></div></div><div className="rs-slots-grid">{entry.slots.sort((a,b)=>parseDate(a.fecha)-parseDate(b.fecha)).map(slot => ( <button key={slot.id} className="rs-slot-btn" onClick={() => selectSlot(entry.profesional.id, slot.fecha)}>{fmtTime(slot.fecha)}</button> ))}</div></div> ))}
                </div> </> )} 
                {step === 4 && ( <> <h2 className="web-title">Confirmar Reserva</h2><ReservaDetalleCard title="Resumen" showTotal={true} /><div className="bottom-bar"><button className="btn-block-action" disabled={loading} onClick={initPaymentProcess}>{loading ? 'Iniciando Pago...' : 'Ir a Pagar'}</button></div> </> )} 
            </div> 
            
            {showPayModal && preferenceId && ( 
                <Modal onClose={()=>setShowPayModal(false)} title="Finalizar Pago"> 
                    <div style={{padding: '10px 0'}}> 
                        <p style={{marginBottom: 20, textAlign: 'center', color: '#666'}}> Serás redirigido a Mercado Pago de forma segura. </p> 
                        <Wallet initialization={{ preferenceId: preferenceId }} /> 
                    </div> 
                </Modal> 
            )} 
        </div> 
    )
}

// 🔐 LAYOUT ADMINISTRATIVO
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

// 📅 AGENDA RESUMEN (CALENDARIO)
function AgendaResumen({reservas, tratamientos, reload, user, isAdmin}){
    const [pros, setPros] = useState([]); 
    const [filterPro, setFilterPro] = useState(isAdmin ? '' : user.id); 
    const [view, setView] = useState('week'); 
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedEvent, setSelectedEvent] = useState(null);
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
    
    const handleEventClick = (r) => {
        setSelectedEvent(r);
        setIsEditing(false); 
        setEditProId('');
        setEditSlot('');
        setAvailableSlots([]);
    };

    const deleteReserva = async(id) => { 
        if(confirm('¿Cancelar y eliminar esta cita?')){
            await cancelarReserva(id); reload(); setSelectedEvent(null);
        } 
    };

    const startEditing = async () => {
        setIsEditing(true);
        setEditProId(selectedEvent.profesionalId.toString());
        await loadSlotsForPro(selectedEvent.profesionalId);
    };

    const loadSlotsForPro = async (pid) => {
        const slots = await getHorariosByProfesional(pid);
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
                    {/* 🔥 MES VISIBLE */}
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
                                const et = r.fechaFin ? parseDate(r.fechaFin) : new Date(st.getTime() + 45*60000);
                                const h=st.getUTCHours(), m=st.getUTCMinutes(); 
                                const top = ((h-8)*60)+m; 
                                
                                // 🔥 ALTURA REAL: 1min = 1px
                                let duration = (et.getTime() - st.getTime()) / 60000;
                                if (duration < 30) duration = 30;

                                return ( 
                                    <div key={r.id} className={`cal-event ${r.estado === 'BLOQUEADA' ? 'evt-block' : 'evt-blue'}`} style={{top, height: duration, background: r.estado === 'BLOQUEADA' ? '#374151' : '#dbeafe', borderLeft: r.estado === 'BLOQUEADA' ? '4px solid #111' : '4px solid #3b82f6', color: r.estado === 'BLOQUEADA' ? '#fff' : '#1e3a8a', overflow: 'hidden', lineHeight: '1.1', fontSize: '0.75rem'}} onClick={()=>handleEventClick(r)}> 
                                        <strong>{st.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'})}</strong> 
                                        <span style={{display:'block'}}>{r.estado === 'BLOQUEADA' ? '⛔ BLOQUEO' : r.pacienteNombre}</span> 
                                    </div> 
                                ) 
                            })} 
                        </div> 
                    ))} 
                </div> 
            </div> 
            
            {/* MODAL DETALLE */}
            {selectedEvent && ( <Modal title="Detalle Cita" onClose={()=>setSelectedEvent(null)}> 
                {isEditing ? ( <div style={{padding: 10}}> <div className="input-group"><label>Profesional</label><select className="form-control" value={editProId} onChange={handleProChange}>{relevantPros.map(p => (<option key={p.id} value={p.id}>{p.nombreCompleto}</option>))}</select></div> <div className="input-group" style={{marginTop: 15}}><label>Horario</label><select className="form-control" value={editSlot} onChange={e => setEditSlot(e.target.value)}><option value="">Selecciona...</option>{availableSlots.map(s => (<option key={s.id} value={s.fecha}>{fmtDate(s.fecha)} - {fmtTime(s.fecha)}</option>))}</select></div> <div style={{marginTop: 20, display:'flex', gap:10, justifyContent:'flex-end'}}><button className="btn-edit" onClick={() => setIsEditing(false)}>Cancelar</button><button className="btn-primary" onClick={saveChanges}>Guardar</button></div> </div> ) : ( <> 
                <div style={{background: selectedEvent.estado === 'BLOQUEADA' ? '#374151' : '#ecfdf5', color: selectedEvent.estado === 'BLOQUEADA' ? '#fff' : '#065f46', padding:10, borderRadius:8, marginBottom:15, fontWeight:'bold', textAlign:'center'}}>{selectedEvent.estado === 'BLOQUEADA' ? 'BLOQUEO' : 'CONFIRMADA'}</div>
                <div style={{marginBottom:20}}> <p><strong>Fecha:</strong> {fmtDate(selectedEvent.fecha)} {fmtTime(selectedEvent.fecha)}</p> <p><strong>Profesional:</strong> {selectedEvent.profesionalNombre}</p> <p><strong>Paciente:</strong> {selectedEvent.pacienteNombre}</p> </div>
                <div style={{display:'flex', gap:10}}> {selectedEvent.estado !== 'BLOQUEADA' && <button className="btn-edit" style={{flex:1}} onClick={startEditing}>Modificar</button>} <button className="btn-danger" style={{flex:1}} onClick={()=>deleteReserva(selectedEvent.id)}>{selectedEvent.estado==='BLOQUEADA'?'Eliminar Bloqueo':'Cancelar'}</button> </div> </> )} 
            </Modal> )} 
        </div> 
    )
}

// 📅 GESTOR DE HORARIOS
function AgendaHorarios({ user, isAdmin }) {
    const [activeTab, setActiveTab] = useState('pattern'); const [pros, setPros] = useState([]); const [rango, setRango] = useState({ inicio: new Date().toISOString().split('T')[0], fin: '' }); const [configBase, setConfigBase] = useState({ duracionSlot: 45, intervalo: 0 }); const [profesionalSel, setProfesionalSel] = useState(isAdmin ? '' : user.id); const [loading, setLoading] = useState(false); const [bloqueo, setBloqueo] = useState({ fecha: new Date().toISOString().split('T')[0], horaInicio: '', horaFin: '' });
    // 🔥 ESTADOS PARA VER ACTIVOS
    const [misConfigs, setMisConfigs] = useState([]); const [misBloqueos, setMisBloqueos] = useState([]);

    const [patron, setPatron] = useState({ 1: { id: 1, label: 'Lunes', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' }, 2: { id: 2, label: 'Martes', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' }, 3: { id: 3, label: 'Miércoles', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' }, 4: { id: 4, label: 'Jueves', activo: true, horaInicio: '09:00', horaFin: '18:00', breakInicio: '', breakFin: '' }, 5: { id: 5, label: 'Viernes', activo: true, horaInicio: '09:00', horaFin: '17:00', breakInicio: '', breakFin: '' }, 6: { id: 6, label: 'Sábado', activo: false, horaInicio: '10:00', horaFin: '13:00', breakInicio: '', breakFin: '' }, 7: { id: 7, label: 'Domingo', activo: false, horaInicio: '', horaFin: '', breakInicio: '', breakFin: '' } });

    useEffect(() => { getProfesionales().then(setPros); loadData(); }, []);

    const loadData = async () => {
        try {
            const cData = await getConfiguraciones(); setMisConfigs(Array.isArray(cData) ? cData : []);
            const rData = await getReservasDetalle(); setMisBloqueos(Array.isArray(rData) ? rData.filter(r => r.estado === 'BLOQUEADA') : []);
        } catch(e){}
    }

    const handlePatronChange = (diaId, field, value) => { setPatron(prev => ({ ...prev, [diaId]: { ...prev[diaId], [field]: value } })); };
    const toggleDia = (diaId) => { setPatron(prev => ({ ...prev, [diaId]: { ...prev[diaId], activo: !prev[diaId].activo } })); };

    const generarHorarioMasivo = async () => {
        if (!profesionalSel || !rango.fin) return alert("Datos incompletos"); if(!confirm("Se reemplazarán los horarios. ¿Seguro?")) return;
        setLoading(true); try { await fetch(`${API_BASE_URL}/configuracion/masiva`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ profesionalId: profesionalSel, fechaInicio: rango.inicio, fechaFin: rango.fin, duracionSlot: configBase.duracionSlot, intervalo: configBase.intervalo, patronSemanal: patron }) }); alert(`✅ Listo`); loadData(); } catch (error) { alert("Error"); } finally { setLoading(false); }
    };

    const crearBloqueo = async () => {
        if (!profesionalSel || !bloqueo.horaFin) return alert("Datos incompletos");
        setLoading(true); try { await fetch(`${API_BASE_URL}/configuracion/bloquear`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ profesionalId: profesionalSel, ...bloqueo }) }); alert(`🚫 Bloqueo creado`); loadData(); } catch(e) { alert("Error"); } finally { setLoading(false); }
    }

    const borrarConfig = async (id) => { if(confirm("¿Eliminar?")) { await deleteConfiguracion(id); loadData(); } }
    const borrarBloqueo = async (id) => { if(confirm("¿Eliminar bloqueo?")) { await cancelarReserva(id); loadData(); } }

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestor de Disponibilidad</h1></div></div>
            <div className="pro-card" style={{ maxWidth: 1000, margin: '0 auto' }}>
                <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: 20 }}>
                    <button onClick={() => setActiveTab('pattern')} style={{ padding: '10px 20px', background: activeTab === 'pattern' ? '#eee' : 'transparent', borderBottom: activeTab === 'pattern' ? '3px solid #000' : 'none', fontWeight: 'bold' }}>📅 Generador</button>
                    <button onClick={() => setActiveTab('block')} style={{ padding: '10px 20px', background: activeTab === 'block' ? '#fee2e2' : 'transparent', borderBottom: activeTab === 'block' ? '3px solid #dc2626' : 'none', fontWeight: 'bold', color: '#991b1b' }}>🚫 Bloquear</button>
                    <button onClick={() => setActiveTab('list')} style={{ padding: '10px 20px', background: activeTab === 'list' ? '#e0f2fe' : 'transparent', borderBottom: activeTab === 'list' ? '3px solid #0284c7' : 'none', fontWeight: 'bold', color: '#0369a1' }}>📋 Ver Activos</button>
                </div>
                <div style={{ marginBottom: 20 }}> <label>Profesional</label> {isAdmin ? ( <select className="form-control" value={profesionalSel} onChange={e => setProfesionalSel(e.target.value)}><option value="">Seleccionar...</option>{pros.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select> ) : ( <input className="form-control" value={user.nombre} disabled /> )} </div>

                {activeTab === 'pattern' && (
                    <div>
                        <div style={{ background: '#f3f4f6', padding: 15, borderRadius: 8, marginBottom: 20 }}> <div className="input-row"> <div><label>Duración</label><select className="form-control" value={configBase.duracionSlot} onChange={e => setConfigBase({ ...configBase, duracionSlot: e.target.value })}><option value="15">15 Min</option><option value="30">30 Min</option><option value="45">45 Min</option><option value="60">60 Min</option></select></div> <div><label>Intervalo</label><input type="number" className="form-control" value={configBase.intervalo} onChange={e => setConfigBase({ ...configBase, intervalo: e.target.value })} /></div> </div> <div className="input-row"> <div><label>Desde</label><input type="date" className="form-control" value={rango.inicio} onChange={e => setRango({ ...rango, inicio: e.target.value })} /></div> <div><label>Hasta</label><input type="date" className="form-control" value={rango.fin} onChange={e => setRango({ ...rango, fin: e.target.value })} /></div> </div> </div>
                        <div style={{ overflowX: 'auto' }}> <table className="data-table"> <thead><tr style={{ background: '#111', color: 'white' }}><th>Activo</th><th>Día</th><th>Entrada</th><th>Salida</th><th>Almuerzo Ini</th><th>Almuerzo Fin</th></tr></thead> <tbody> {Object.values(patron).map(dia => ( <tr key={dia.id}> <td style={{textAlign:'center'}}><input type="checkbox" checked={dia.activo} onChange={() => toggleDia(dia.id)} /></td> <td><strong>{dia.label}</strong></td> <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.horaInicio} onChange={e => handlePatronChange(dia.id, 'horaInicio', e.target.value)} /></td> <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.horaFin} onChange={e => handlePatronChange(dia.id, 'horaFin', e.target.value)} /></td> <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.breakInicio} onChange={e => handlePatronChange(dia.id, 'breakInicio', e.target.value)} /></td> <td><input type="time" className="form-control" disabled={!dia.activo} value={dia.breakFin} onChange={e => handlePatronChange(dia.id, 'breakFin', e.target.value)} /></td> </tr> ))} </tbody> </table> </div>
                        <button className="btn-primary" style={{marginTop:20, width:'100%'}} disabled={loading} onClick={generarHorarioMasivo}>{loading ? '...' : 'Generar Agenda'}</button>
                    </div>
                )}

                {activeTab === 'block' && (
                    <div style={{padding:20, border:'2px dashed #fca5a5', background:'#fef2f2'}}>
                        <h3 style={{color:'#991b1b', marginTop:0}}>Bloquear Horario</h3>
                        <div className="input-row"><div><label>Fecha</label><input type="date" className="form-control" value={bloqueo.fecha} onChange={e => setBloqueo({ ...bloqueo, fecha: e.target.value })} /></div></div>
                        <div className="input-row"> <div><label>Desde</label><input type="time" className="form-control" value={bloqueo.horaInicio} onChange={e => setBloqueo({ ...bloqueo, horaInicio: e.target.value })} /></div> <div><label>Hasta</label><input type="time" className="form-control" value={bloqueo.horaFin} onChange={e => setBloqueo({ ...bloqueo, horaFin: e.target.value })} /></div> </div>
                        <button className="btn-danger" style={{marginTop:20, width:'100%'}} disabled={loading} onClick={crearBloqueo}>{loading ? '...' : 'Bloquear'}</button>
                    </div>
                )}

                {/* 🔥 TABLA DE CONFIGURACIONES VISIBLES */}
                {activeTab === 'list' && (
                    <div>
                        <h3>Configuraciones Disponibles</h3>
                        <div className="data-table-container" style={{maxHeight: 300, overflowY:'auto'}}>
                            <table className="data-table">
                                <thead><tr><th>Fecha</th><th>Horario</th><th>Acción</th></tr></thead>
                                <tbody> {misConfigs.filter(c => !profesionalSel || c.profesionalId == profesionalSel).map(c => ( <tr key={c.id}> <td>{fmtDate(c.fecha)}</td> <td>{c.horaInicio} - {c.horaFin}</td> <td><button className="btn-danger" onClick={()=>borrarConfig(c.id)}>X</button></td> </tr> ))} </tbody>
                            </table>
                        </div>
                        <h3 style={{marginTop:30, color:'#991b1b'}}>Bloqueos Activos</h3>
                        <div className="data-table-container">
                            <table className="data-table">
                                <thead><tr><th>Fecha</th><th>Bloqueo</th><th>Acción</th></tr></thead>
                                <tbody> {misBloqueos.filter(b => !profesionalSel || b.profesionalId == profesionalSel).map(b => ( <tr key={b.id} style={{background:'#fef2f2'}}> <td>{fmtDate(b.fecha)}</td> <td>{fmtTime(b.fecha)} - {fmtTime(b.fechaFin)}</td> <td><button className="btn-danger" onClick={()=>borrarBloqueo(b.id)}>Desbloquear</button></td> </tr> ))} </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 👥 GESTIÓN DE PACIENTES, FICHAS, ETC. (Componentes restantes)
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

// ==========================================
// 🚀 MAIN APP (Al final para que todo esté definido)
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

export default App;