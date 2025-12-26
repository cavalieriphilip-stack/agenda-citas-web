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

initMercadoPago('APP_USR-a5a67c3b-4b4b-44a1-b973-ff2fd82fe90a', { locale: 'es-CL' });
const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

// ==========================================
// 🛠️ HELPERS
// ==========================================
const fmtMoney = (v) => `$${(v || 0).toLocaleString('es-CL')}`;
const parseDate = (iso) => { if (!iso) return new Date(); if (iso.length === 10) return new Date(iso + 'T12:00:00Z'); const clean = iso.endsWith('Z') ? iso : iso + 'Z'; return new Date(clean); };
const fmtDate = (iso) => iso ? parseDate(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', timeZone: 'UTC' }) : '-';
const fmtTime = (iso) => iso ? parseDate(iso).toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', timeZone: 'UTC' }) : '-';
const toDateKey = (iso) => iso ? iso.split('T')[0] : '';
const formatRut = (rut) => { if (!rut) return ''; let value = rut.replace(/[^0-9kK]/g, '').toUpperCase(); if (value.length < 2) return value; return value.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + '-' + value.slice(-1); };
const validateRut = (rut) => { if (!rut || rut.length < 2) return false; const value = rut.replace(/[^0-9kK]/g, '').toUpperCase(); const body = value.slice(0, -1); const dv = value.slice(-1); let suma = 0, multiplo = 2; for (let i = body.length - 1; i >= 0; i--) { suma += multiplo * parseInt(body.charAt(i)); multiplo = multiplo < 7 ? multiplo + 1 : 2; } const dvEsperado = 11 - (suma % 11); const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString(); return dvCalculado === dv; };
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getCategoryFromSpecialty = (specName) => {
    const s = (specName || '').toLowerCase();
    if (s.includes('pack')) return 'Packs'; 
    if (s.includes('fonoaudiología') || s.includes('fonoaudiologia') || s.includes('lenguaje')) return 'Fonoaudiología';
    if (s.includes('psicología') || s.includes('psicologia') || s.includes('mental')) return 'Psicología';
    if (s.includes('matrona') || s.includes('mujer')) return 'Matrona';
    if (s.includes('terapia')) return 'Terapia Ocupacional';
    if (s.includes('nutri')) return 'Nutrición';
    return 'Otros';
};

const authHeader = () => { const token = localStorage.getItem('token'); return { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }; };

// ==========================================
// 🧩 COMPONENTS
// ==========================================
function MultiSelectDropdown({ options, selectedValues, onChange, label, disabled }) {
    const [isOpen, setIsOpen] = useState(false); const wrapperRef = useRef(null); const safeSelected = Array.isArray(selectedValues) ? selectedValues : [];
    useEffect(() => { function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); } document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, []);
    return ( <div className="dropdown-wrapper" ref={wrapperRef}> <label className="form-label">{label}</label> <div className="dropdown-header" onClick={() => !disabled && setIsOpen(!isOpen)} style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#f9fafb' : '#fff' }}> <span>{safeSelected.length > 0 ? `${safeSelected.length} seleccionados` : 'Seleccionar...'}</span> <span>{isOpen ? '▲' : '▼'}</span> </div> {isOpen && !disabled && ( <div className="dropdown-list"> {options.map(opt => ( <div key={opt} className="dropdown-item" onClick={() => { if (safeSelected.includes(opt)) onChange(safeSelected.filter(v => v !== opt)); else onChange([...safeSelected, opt]); }}> <input type="checkbox" checked={safeSelected.includes(opt)} readOnly /> <span>{opt}</span> </div> ))} </div> )} </div> );
}

function Modal({ title, children, onClose }) {
    return createPortal( <div className="modal-overlay" onClick={onClose}> <div className="modal-content" onClick={e => e.stopPropagation()}> <button className="modal-close" onClick={onClose}>×</button> {title && <h2 style={{marginTop:0, marginBottom:20, borderBottom:'1px solid #eee', paddingBottom:10}}>{title}</h2>} {children} </div> </div>, document.body );
}

// ==========================================
// 🚀 COMPONENTES PRINCIPALES (IMPORTANTE: DEFINIDOS ANTES DE APP)
// ==========================================

// 🔴 WEB PACIENTE
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
    
    // Ref para el scroll de fechas
    const dateListRef = useRef(null);

    useEffect(()=>{ 
        getProfesionales().then(setProfesionales);
        fetch(`${API_BASE_URL}/tratamientos`).then(r=>r.json()).then(setTratamientos);
    },[]);

    const categorias = [...new Set(tratamientos.map(t => getCategoryFromSpecialty(t.especialidad)))].sort();
    const especialidadesFiltradas = form.categoria ? [...new Set(tratamientos.filter(t => getCategoryFromSpecialty(t.especialidad) === form.categoria).map(t => t.especialidad))] : [];
    const prestacionesFiltradas = form.especialidad ? tratamientos.filter(t => t.especialidad === form.especialidad) : [];

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
    const prosAptos = form.tratamientoId ? profesionales.filter(p => tratamientoSel && p.tratamientos && p.tratamientos.includes(tratamientoSel.nombre)) : [];

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

    // Funciones para scroll de flechas
    const scrollLeft = () => { if(dateListRef.current) dateListRef.current.scrollBy({ left: -200, behavior: 'smooth' }); };
    const scrollRight = () => { if(dateListRef.current) dateListRef.current.scrollBy({ left: 200, behavior: 'smooth' }); };

    // Título del Mes Visible
    const visibleMonthTitle = selectedDateKey 
        ? parseDate(selectedDateKey).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone:'UTC' }).toUpperCase()
        : (availableDates.length > 0 ? parseDate(availableDates[0]).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone:'UTC' }).toUpperCase() : '');

    if(bookingSuccess) { return ( <div className="web-shell"> <div className="web-content success-card"> <span className="success-icon-big">✓</span> <h1 className="web-title">¡Reserva Exitosa!</h1> <p className="web-subtitle">Enviado a {form.email}</p> <ReservaDetalleCard showTotal={true} /> <button className="btn-block-action" onClick={()=>window.location.href='/'}>Inicio</button> </div> </div> ) }

    return ( 
        <div className="web-shell"> 
            <header className="web-header">{step > 0 && <button className="web-back-btn" onClick={goBack}>‹</button>}<img src={LOGO_URL} alt="Logo" className="cisd-logo-web" /></header> 
            <div className="stepper-container"><div className="stepper"><div className={`step-dot ${step >= 0 ? 'active' : ''}`}></div><div className={`step-line ${step >= 1 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div><div className={`step-line ${step >= 2 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div><div className={`step-line ${step >= 3 ? 'filled' : ''}`}></div><div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div></div></div> 
            <div className="web-content"> 
                {step === 0 && ( <> <div><h2 className="web-title">Bienvenido</h2><p className="web-subtitle">Agenda tu hora médica.</p></div><div className="input-group"><label className="web-label">RUT</label><input className="web-input" placeholder="Ej: 12.345.678-9" value={form.rut} onChange={e=>setForm({...form, rut: formatRut(e.target.value)})} maxLength={12} autoFocus /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.rut || loading} onClick={handleRutSearch}>{loading ? '...' : 'Comenzar'}</button></div> </> )} 
                {step === 1 && ( <> <h2 className="web-title">Datos</h2><div className="input-group"><label className="web-label">Nombre</label><input className="web-input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} /></div><div className="input-group"><label className="web-label">Email</label><input className="web-input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} /></div><div className="input-group"><label className="web-label">Teléfono</label><input className="web-input" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} /></div><div className="bottom-bar"><button className="btn-block-action" disabled={!form.nombre || !validateEmail(form.email)} onClick={()=>setStep(2)}>Guardar</button></div> </> )} 
                {step === 2 && ( <> <h2 className="web-title">Servicio</h2> <div className="input-group"><label className="web-label">Categoría</label><select className="web-select" value={form.categoria} onChange={e=>setForm({...form, categoria:e.target.value, especialidad:'', tratamientoId:''})}><option value="">Selecciona...</option>{categorias.map(c=><option key={c} value={c}>{c}</option>)}</select></div> <div className="input-group"><label className="web-label">Especialidad</label><select className="web-select" disabled={!form.categoria} value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value, tratamientoId:''})}><option value="">Selecciona...</option>{especialidadesFiltradas.map(e=><option key={e} value={e}>{e}</option>)}</select></div> <div className="input-group"><label className="web-label">Tratamiento</label><select className="web-select" disabled={!form.especialidad} value={form.tratamientoId} onChange={e=>setForm({...form, tratamientoId:e.target.value})}><option value="">Selecciona...</option>{prestacionesFiltradas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div> <div className="bottom-bar"><button className="btn-block-action" disabled={!form.tratamientoId || loading} onClick={handleTreatmentConfirm}>{loading ? '...' : 'Buscar'}</button></div> </> )} 
                {step === 3 && ( <> 
                    <h2 className="web-title">Horario</h2>
                    {visibleMonthTitle && <div style={{textAlign:'center', marginBottom:10, fontWeight:'bold', color:'#374151'}}>{visibleMonthTitle}</div>}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:15}}>
                        <button onClick={scrollLeft} style={{background:'#e5e7eb', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:'1.2rem', color:'#374151'}}>‹</button>
                        <div className="rs-date-tabs" ref={dateListRef} style={{flex:1, overflowX:'auto', whiteSpace:'nowrap', scrollBehavior:'smooth', margin:'0 10px', paddingBottom:5}}>
                            {availableDates.map(dateStr => { const dateObj = parseDate(dateStr + 'T00:00:00'); return ( <div key={dateStr} className={`rs-date-tab ${selectedDateKey === dateStr ? 'selected' : ''}`} onClick={() => setSelectedDateKey(dateStr)} style={{display:'inline-block', marginRight:8}}><div className="rs-day-name">{dateObj.toLocaleDateString('es-CL', {weekday: 'short', timeZone: 'UTC'})}</div><div className="rs-day-number">{dateObj.getUTCDate()}</div></div> ); })}
                        </div>
                        <button onClick={scrollRight} style={{background:'#e5e7eb', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:'1.2rem', color:'#374151'}}>›</button>
                    </div>
                    <div className="rs-pro-list" style={{maxHeight:'400px', overflowY:'auto', paddingRight:'5px'}}>
                        {multiAgenda[selectedDateKey]?.map((entry) => ( <div key={entry.profesional.id} className="rs-pro-card"><div className="rs-pro-header"><div className="rs-avatar-circle">{entry.profesional.nombreCompleto.charAt(0)}</div><div className="rs-pro-details"><strong>{entry.profesional.nombreCompleto}</strong><span>{entry.profesional.especialidad}</span></div></div><div className="rs-slots-grid">{entry.slots.sort((a,b)=>parseDate(a.fecha)-parseDate(b.fecha)).map(slot => ( <button key={slot.id} className="rs-slot-btn" onClick={() => selectSlot(entry.profesional.id, slot.fecha)}>{fmtTime(slot.fecha)}</button> ))}</div></div> ))}
                    </div> </> )} 
                {step === 4 && ( <> <h2 className="web-title">Confirmar</h2><ReservaDetalleCard showTotal={true} /><div className="bottom-bar"><button className="btn-block-action" disabled={loading} onClick={initPaymentProcess}>{loading ? '...' : 'Pagar'}</button></div> </> )} 
            </div> 
            {showPayModal && preferenceId && ( <Modal onClose={()=>setShowPayModal(false)} title="Pago"> <div style={{padding: '10px 0'}}> <p style={{marginBottom: 20, textAlign: 'center', color: '#666'}}> Redirigiendo... </p> <Wallet initialization={{ preferenceId: preferenceId }} /> </div> </Modal> )} 
        </div> 
    )
}

// 📅 AGENDA: NUEVA RESERVA MANUAL
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
                        <div><label className="form-label">Paciente</label><select className="form-control" value={form.pacienteId} onChange={e => setForm({ ...form, pacienteId: e.target.value })}><option>Seleccionar...</option>{pacientes.filter(p => p.rut !== 'BLOQUEO').map(p => <option key={p.id} value={p.id}>{p.nombreCompleto} ({formatRut(p.rut)})</option>)}</select></div> 
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

// 👔 GESTIÓN DE PROFESIONALES
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

// 💊 GESTIÓN DE PRESTACIONES
function AgendaTratamientos({ reload }) {
    const [items, setItems] = useState([]); const [form, setForm] = useState({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '', categoria: '' }); const [isEditing, setIsEditing] = useState(false);
    
    const load = () => fetch(`${API_BASE_URL}/tratamientos`).then(r => r.json()).then(setItems);
    useEffect(() => { load(); }, []);
    
    // Categoría Automática o Manual
    const handleSpecChange = (e) => {
        const spec = e.target.value;
        const autoCat = getCategoryFromSpecialty(spec);
        setForm({...form, especialidad: spec, categoria: autoCat});
    };

    const save = async (e) => { 
        e.preventDefault(); 
        const method = isEditing ? 'PUT' : 'POST'; 
        const url = isEditing ? `${API_BASE_URL}/tratamientos/${form.id}` : `${API_BASE_URL}/tratamientos`; 
        
        // Crear copia limpia sin campos extraños para evitar error 500
        const payload = {
            nombre: form.nombre,
            codigo: form.codigo,
            valor: form.valor,
            descripcion: form.descripcion,
            especialidad: form.especialidad
        };

        await fetch(url, { method, headers: authHeader(), body: JSON.stringify(payload) }); 
        setForm({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '', categoria: '' }); 
        setIsEditing(false); load(); if(reload) reload(); 
    };

    const handleEdit = (it) => { setForm({...it, categoria: getCategoryFromSpecialty(it.especialidad)}); setIsEditing(true); window.scrollTo(0,0); };
    const handleDelete = async (id) => { if(confirm('¿Eliminar?')) { await fetch(`${API_BASE_URL}/tratamientos/${id}`, { method: 'DELETE', headers: authHeader() }); load(); } };
    
    return ( <div> <div className="page-header"><div className="page-title"><h1>Gestión de Prestaciones</h1></div></div> <div className="pro-card"> <h3>{isEditing ? 'Editar' : 'Nueva'}</h3> <form onSubmit={save}> <div className="input-row"> <div><label className="form-label">Nombre del Tratamiento</label><input className="form-control" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required /></div> <div><label className="form-label">Especialidad (Pública)</label><input className="form-control" value={form.especialidad} onChange={handleSpecChange} required /></div> </div> <div className="input-row"> <div><label className="form-label">Código</label><input className="form-control" value={form.codigo} onChange={e=>setForm({...form, codigo:e.target.value})} /></div> <div><label className="form-label">Categoría (Auto)</label><input className="form-control" value={form.categoria} onChange={e=>setForm({...form, categoria:e.target.value})} /></div> <div><label className="form-label">Valor</label><input type="number" className="form-control" value={form.valor} onChange={e=>setForm({...form, valor:e.target.value})} required /></div> </div> <button className="btn-primary">Guardar</button> {isEditing && <button type="button" className="btn-edit" style={{marginLeft:10}} onClick={()=>{setIsEditing(false); setForm({ id: null, nombre: '', codigo: '', valor: '', descripcion: '', especialidad: '', categoria: '' })}}>Cancelar</button>} </form> </div> <div className="pro-card"> <div className="data-table-container"> 
        <table className="data-table"> <thead><tr><th>Código</th><th>Categoría</th><th>Tratamiento</th><th>Especialidad</th><th>Valor</th><th>Acciones</th></tr></thead> <tbody> {items.map(it => ( <tr key={it.id}> <td>{it.codigo}</td> <td>{getCategoryFromSpecialty(it.especialidad)}</td> <td>{it.nombre}</td> <td>{it.especialidad}</td> <td>{fmtMoney(it.valor)}</td> <td> <button className="btn-edit" onClick={()=>handleEdit(it)}>Edit</button> <button className="btn-danger" onClick={()=>handleDelete(it.id)}>X</button> </td> </tr> ))} </tbody> </table> 
    </div> </div> </div> );
}

function FinanzasReporte({total,count,reservas}){ 
    const validReservas = reservas ? reservas.filter(r => r.estado !== 'BLOQUEADA' && r.estado !== 'CANCELADA') : [];
    
    const statsPro = validReservas.reduce((acc, curr) => { 
        if(curr.profesionalNombre) { 
            acc[curr.profesionalNombre] = (acc[curr.profesionalNombre] || 0) + 1; 
        }
        return acc; 
    }, {}); 
    
    const statsTrat = validReservas.reduce((acc, curr) => { 
        if(curr.motivo) {
            acc[curr.motivo] = (acc[curr.motivo] || 0) + 1; 
        }
        return acc; 
    }, {}); 
    
    const totalReal = validReservas.reduce((acc, r) => acc + (r.valor || 0), 0);
    const countReal = validReservas.length;

    return ( <div> <div className="page-header"><div className="page-title"><h1>Reporte Financiero</h1></div></div> <div className="kpi-grid"> <div className="kpi-box"><div className="kpi-label">Ingresos</div><div className="kpi-value">{fmtMoney(totalReal)}</div></div> <div className="kpi-box"><div className="kpi-label">Citas</div><div className="kpi-value">{countReal}</div></div> </div> <div className="input-row finance-section"> <div className="pro-card"> <h3>Atenciones por Profesional</h3> <div className="data-table-container"> <table className="finance-table"><thead><tr><th>Profesional</th><th>Citas</th></tr></thead><tbody>{Object.entries(statsPro).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table> </div> </div> <div className="pro-card"> <h3>Agendas por Tratamiento</h3> <div className="data-table-container"> <table className="finance-table"><thead><tr><th>Tratamiento</th><th>Cantidad</th></tr></thead><tbody>{Object.entries(statsTrat).map(([k,v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table> </div> </div> </div> </div> ) 
}

// 📅 AGENDA RESUMEN (CALENDARIO) RESTAURADO CON DETALLE Y LINKS
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
                                // Calcular fin para dibujar bloque
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
            
            {/* MODAL DETALLE DE CITA RESTAURADO */}
            {selectedEvent && ( <Modal title="Detalle Cita" onClose={()=>setSelectedEvent(null)}> 
                {isEditing ? ( <div style={{padding: 10}}> <div className="input-group"><label>Profesional</label><select className="form-control" value={editProId} onChange={handleProChange}>{relevantPros.map(p => (<option key={p.id} value={p.id}>{p.nombreCompleto}</option>))}</select></div> <div className="input-group" style={{marginTop: 15}}><label>Horario</label><select className="form-control" value={editSlot} onChange={e => setEditSlot(e.target.value)}><option value="">Selecciona...</option>{availableSlots.map(s => (<option key={s.id} value={s.fecha}>{fmtDate(s.fecha)} - {fmtTime(s.fecha)}</option>))}</select></div> <div style={{marginTop: 20, display:'flex', gap:10, justifyContent:'flex-end'}}><button className="btn-edit" onClick={() => setIsEditing(false)}>Cancelar</button><button className="btn-primary" onClick={saveChanges}>Guardar</button></div> </div> ) : ( <> 
                <div style={{background: selectedEvent.estado === 'BLOQUEADA' ? '#374151' : '#ecfdf5', color: selectedEvent.estado === 'BLOQUEADA' ? '#fff' : '#065f46', padding:10, borderRadius:8, marginBottom:15, fontWeight:'bold', textAlign:'center'}}>{selectedEvent.estado === 'BLOQUEADA' ? 'BLOQUEO' : 'CONFIRMADA'}</div>
                
                {/* TARJETA DETALLE RESTAURADA */}
                <div style={{marginBottom:20, lineHeight:'1.6'}}> 
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                        <div><label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666'}}>FECHA</label><div>{fmtDate(selectedEvent.fecha)}</div></div>
                        <div><label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666'}}>HORA</label><div>{fmtTime(selectedEvent.fecha)}</div></div>
                    </div>
                    <div style={{marginTop:10}}><label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666'}}>PACIENTE</label><div style={{fontSize:'1.1rem'}}>{selectedEvent.pacienteNombre}</div></div>
                    <div style={{marginTop:10}}><label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666'}}>PROFESIONAL</label><div>{selectedEvent.profesionalNombre}</div></div>
                    <div style={{marginTop:10}}><label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666'}}>TRATAMIENTO</label><div>{selectedEvent.motivo}</div></div>

                    {selectedEvent.estado !== 'BLOQUEADA' && (
                        <div style={{marginTop:15, background:'#f9fafb', padding:10, borderRadius:6}}>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Email:</span> <strong>{selectedEvent.pacienteEmail || '-'}</strong></div>
                            <div style={{display:'flex', justifyContent:'space-between', marginTop:5}}><span>Fono:</span> <strong>{selectedEvent.pacienteTelefono || '-'}</strong></div>
                            <div style={{display:'flex', justifyContent:'space-between', marginTop:5, borderTop:'1px solid #eee', paddingTop:5}}><span>Valor:</span> <strong style={{color:'#059669'}}>{fmtMoney(selectedEvent.valor)}</strong></div>
                        </div>
                    )}
                </div>

                {/* BOTÓN VIDEOLLAMADA */}
                {(selectedEvent.motivo.toLowerCase().includes('online') || selectedEvent.motivo.toLowerCase().includes('teleconsulta')) && selectedEvent.estado !== 'BLOQUEADA' && (
                    <div style={{marginBottom: 20}}>
                        <a href={`https://meet.jit.si/CISD-Reserva-${selectedEvent.id}#userInfo.displayName=${encodeURIComponent(user.nombre)}`} target="_blank" rel="noreferrer" style={{display:'flex', justifyContent:'center', alignItems:'center', gap:8, background:'#2563eb', color:'white', textDecoration:'none', padding:'15px', borderRadius:8, fontWeight:'bold', fontSize:'1rem'}}>
                            <span>🎥</span> Conectarse a Video Consulta
                        </a>
                    </div>
                )}

                <div style={{display:'flex', gap:10}}> {selectedEvent.estado !== 'BLOQUEADA' && <button className="btn-edit" style={{flex:1}} onClick={startEditing}>Modificar</button>} <button className="btn-danger" style={{flex:1}} onClick={()=>deleteReserva(selectedEvent.id)}>{selectedEvent.estado==='BLOQUEADA'?'Eliminar Bloqueo':'Cancelar Cita'}</button> </div> </> )} 
            </Modal> )} 
        </div> 
    )
}

// 🔐 LAYOUT ADMINISTRATIVO
function AdminLayout() {
    const [activeModule, setActiveModule] = useState('agenda'); const [activeView, setActiveView] = useState('resumen'); const [mobileMenuOpen, setMobileMenuOpen] = useState(false); const navigate = useNavigate(); const user = JSON.parse(localStorage.getItem('usuario') || '{}'); const token = localStorage.getItem('token'); const isAdmin = user.rol === 'ADMIN';
    useEffect(() => { if (!user.id || !token) navigate('/login'); }, [navigate, user.id, token]);
    const handleModuleSwitch = (mod, view) => { setActiveModule(mod); setActiveView(view); setMobileMenuOpen(false); }
    return (
        <div className="dashboard-layout">
            <nav className="top-nav"> <div className="brand-area"> <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button> <img src={LOGO_URL} alt="Logo" className="cisd-logo-admin" /> <span className="admin-title-text">CISD {isAdmin ? 'Admin' : 'Profesional'}</span> </div> <div className="module-switcher desktop-view-only"> <button className={`module-tab ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => handleModuleSwitch('agenda', 'resumen')}>Clínica</button> <button className={`module-tab ${activeModule === 'clientes' ? 'active' : ''}`} onClick={() => handleModuleSwitch('clientes', 'listado')}>Pacientes</button> {isAdmin && <button className={`module-tab ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => handleModuleSwitch('finanzas', 'reporte')}>Finanzas</button>} </div> <div className="nav-actions"> <span className="desktop-view-only" style={{marginRight:10, fontSize:'0.9rem', fontWeight:'600'}}>{user.nombre}</span> <button onClick={() => {localStorage.removeItem('usuario'); localStorage.removeItem('token'); navigate('/login');}} className="btn-danger" style={{padding:'5px 15px', fontSize:'0.8rem'}}>Salir</button> </div> </nav>
            <div className="workspace"> {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>} <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}> <div className="mobile-view-only" style={{marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #eee'}}> <div className="sidebar-header">MÓDULOS</div> <div className={`nav-item ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => handleModuleSwitch('agenda', 'resumen')}>🏥 Clínica</div> <div className={`nav-item ${activeModule === 'clientes' ? 'active' : ''}`} onClick={() => handleModuleSwitch('clientes', 'listado')}>👥 Pacientes</div> {isAdmin && <div className={`nav-item ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => handleModuleSwitch('finanzas', 'reporte')}>💰 Finanzas</div>} </div> <div className="sidebar-header">NAVEGACIÓN</div> {activeModule === 'agenda' && ( <> <div className={`nav-item ${activeView==='resumen'?'active':''}`} onClick={()=>setActiveView('resumen')}>Calendario</div> <div className={`nav-item ${activeView==='reservas'?'active':''}`} onClick={()=>setActiveView('reservas')}>Nueva Reserva</div> <div className={`nav-item ${activeView==='horarios'?'active':''}`} onClick={()=>setActiveView('horarios')}>Mis Horarios</div> {isAdmin && ( <> <div className="sidebar-header" style={{marginTop:20}}>ADMINISTRACIÓN</div> <div className={`nav-item ${activeView==='profesionales'?'active':''}`} onClick={()=>setActiveView('profesionales')}>Profesionales</div> <div className={`nav-item ${activeView==='prestaciones'?'active':''}`} onClick={()=>setActiveView('prestaciones')}>Prestaciones</div> </> )} </> )} {activeModule === 'clientes' && <div className={`nav-item ${activeView==='listado'?'active':''}`} onClick={()=>setActiveView('listado')}>Directorio</div>} {isAdmin && activeModule === 'finanzas' && <div className={`nav-item ${activeView==='reporte'?'active':''}`} onClick={()=>setActiveView('reporte')}>Ver Reportes</div>} </aside> <main className="main-stage"> <DashboardContent module={activeModule} view={activeView} user={user} isAdmin={isAdmin} /> </main> </div>
        </div>
    );
}

function DashboardContent({ module, view, user, isAdmin }) {
    const [reservas, setReservas] = useState([]); const [tratamientos, setTratamientos] = useState([]);
    const refreshData = async () => { try { const data = await getReservasDetalle(); setReservas(data || []); const trats = await fetch(`${API_BASE_URL}/tratamientos`).then(r => r.json()); setTratamientos(trats || []); } catch (e) { console.error(e); } };
    useEffect(() => { refreshData(); }, []);
    if (module === 'agenda') {
        if (view === 'resumen') return <AgendaResumen reservas={reservas} tratamientos={tratamientos} reload={refreshData} user={user} isAdmin={isAdmin} />;
        if (view === 'reservas') return <AgendaNuevaReserva reload={refreshData} reservas={reservas} tratamientos={tratamientos} user={user} isAdmin={isAdmin} />;
        if (view === 'horarios') return <AgendaHorarios user={user} isAdmin={isAdmin} />;
        if (isAdmin) { if (view === 'profesionales') return <AgendaProfesionales tratamientos={tratamientos} />; if (view === 'prestaciones') return <AgendaTratamientos reload={refreshData} />; } else { if (view === 'profesionales' || view === 'prestaciones') return <AgendaResumen reservas={reservas} tratamientos={tratamientos} reload={refreshData} user={user} isAdmin={isAdmin} />; }
    }
    if (module === 'clientes') return <AgendaPacientes />;
    if (module === 'finanzas' && isAdmin) { const total = reservas.reduce((acc, r) => acc + (r.valor || 0), 0); return <FinanzasReporte total={total} count={reservas.length} reservas={reservas} />; }
    return <div>Cargando...</div>;
}

// 🚀 MAIN APP
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