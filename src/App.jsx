import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './App.css';
import {
    API_BASE_URL, getPacientes, getProfesionales, getHorariosByProfesional,
    getReservasDetalle, crearReserva, crearPaciente, cancelarReserva, reagendarReserva,
    updatePaciente, deletePaciente, getConfiguraciones, deleteConfiguracion,
    buscarPacientePorRut
} from './api';

// DATA MAESTRA
const TRATAMIENTOS = [
    { id: 1, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto online', valor: 20000 },
    { id: 2, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto presencial', valor: 35000 },
    { id: 3, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto domicilio - RM', valor: 30000 },
    { id: 4, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto domicilio - Alrededor RM', valor: 50000 },
    { id: 5, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto online', valor: 20000 },
    { id: 6, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto presencial', valor: 35000 },
    { id: 7, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto domicilio - RM', valor: 30000 },
    { id: 8, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto domicilio - Alrededor RM', valor: 50000 },
    { id: 9, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Otoscopía + Lavado de oídos', valor: 20000 },
    { id: 10, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica infanto-juvenil online', valor: 20000 },
    { id: 11, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica presencial', valor: 35000 },
    { id: 12, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica domicilio - RM', valor: 30000 },
    { id: 13, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica domicilio - Alrededor RM', valor: 50000 },
    { id: 14, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica online', valor: 20000 },
    { id: 15, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica presencial', valor: 35000 },
    { id: 16, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica domicilio - RM', valor: 30000 },
    { id: 17, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica domicilio - Alrededor RM', valor: 50000 },
    { id: 18, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Otoscopía + Lavado de oídos', valor: 20000 },
    { id: 19, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Online', valor: 25000 },
    { id: 20, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Presencial - Stgo Centro', valor: 35000 },
    { id: 21, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Presencial - Providencia', valor: 35000 },
    { id: 24, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto online', valor: 25000 },
    { id: 25, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto Presencial - Stgo Centro', valor: 35000 },
    { id: 26, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto Presencial - Providencia', valor: 35000 },
    { id: 29, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil online', valor: 25000 },
    { id: 30, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil Presencial - Stgo Centro', valor: 35000 },
    { id: 31, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil Presencial - Providencia', valor: 35000 },
    { id: 34, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil online', valor: 25000 },
    { id: 35, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil Presencial - Stgo Centro', valor: 35000 },
    { id: 36, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil Presencial - Providencia', valor: 35000 },
    { id: 39, especialidad: 'Matrona', tratamiento: 'Ginecología Infanto-Juvenil', valor: 16000 },
    { id: 41, especialidad: 'Matrona', tratamiento: 'Ginecología General', valor: 16000 },
    { id: 45, especialidad: 'Matrona', tratamiento: 'Asesoría de Lactancia', valor: 16000 },
    { id: 54, especialidad: 'Psicopedagogía', tratamiento: 'Evaluación Psicopedagógica Online', valor: 20000 },
    { id: 55, especialidad: 'Psicopedagogía', tratamiento: 'Sesión Psicopedagogía Online', valor: 20000 },
];

const STEPS = [ {n:1, t:'Datos'}, {n:2, t:'Servicio'}, {n:3, t:'Agenda'}, {n:4, t:'Confirmar'} ];

// Utils
const fmtMoney = (v) => `$${v.toLocaleString('es-CL')}`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('es-CL', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '-';
const toDateKey = (iso) => { 
    if(!iso) return '';
    // Fix zona horaria para visualizacion:
    // Cortamos el string ISO en la T para obtener YYYY-MM-DD puro sin conversión horaria
    return iso.split('T')[0]; 
};
const formatRut = (rut) => rut.replace(/[^0-9kK]/g, '').toUpperCase();
const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

function App() {
    if (window.location.pathname.startsWith('/centro')) return <AdminLayout />;
    return <WebPaciente />;
}

// =========================================================
// PANEL ADMIN
// =========================================================
function AdminLayout() {
    const [activeModule, setActiveModule] = useState('agenda');
    const [activeView, setActiveView] = useState('resumen');
    
    return (
        <div className="dashboard-layout">
            <nav className="top-nav">
                <div className="brand-area">
                    <img src={LOGO_URL} alt="CISD Logo" className="cisd-logo-admin" />
                    <span>CISD Admin</span>
                </div>
                <div className="module-switcher">
                    <button className={`module-tab ${activeModule === 'agenda' ? 'active' : ''}`} onClick={() => {setActiveModule('agenda'); setActiveView('resumen');}}>Gestión Clínica</button>
                    <button className={`module-tab ${activeModule === 'finanzas' ? 'active' : ''}`} onClick={() => {setActiveModule('finanzas'); setActiveView('reporte');}}>Finanzas</button>
                </div>
                <div className="nav-actions"><a href="/" className="btn-top-action">Ver Web Paciente</a></div>
            </nav>

            <div className="workspace">
                <aside className="sidebar">
                    <div className="sidebar-header">MENÚ {activeModule}</div>
                    {activeModule === 'agenda' && (
                        <>
                            <div className={`nav-item ${activeView==='resumen'?'active':''}`} onClick={()=>setActiveView('resumen')}>Resumen Agendamientos</div>
                            <div className={`nav-item ${activeView==='reservas'?'active':''}`} onClick={()=>setActiveView('reservas')}>Nueva Reserva</div>
                            <div className={`nav-item ${activeView==='pacientes'?'active':''}`} onClick={()=>setActiveView('pacientes')}>Administrar Pacientes</div>
                            <div className={`nav-item ${activeView==='profesionales'?'active':''}`} onClick={()=>setActiveView('profesionales')}>Administrar Profesionales</div>
                            <div className={`nav-item ${activeView==='horarios'?'active':''}`} onClick={()=>setActiveView('horarios')}>Administrar Horarios</div>
                        </>
                    )}
                    {activeModule === 'finanzas' && <div className={`nav-item ${activeView==='reporte'?'active':''}`} onClick={()=>setActiveView('reporte')}>Dashboard Financiero</div>}
                </aside>
                <main className="main-stage">
                    <DashboardContent module={activeModule} view={activeView} />
                </main>
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

// ---------------------- SUBVISTAS ADMIN ----------------------

function AgendaPacientes(){
    const [pacientes,setPacientes]=useState([]);
    const [form,setForm]=useState({nombreCompleto:'',email:'',telefono:'', rut:''});
    const [editingId, setEditingId] = useState(null);
    
    const load=()=>getPacientes().then(setPacientes);
    useEffect(()=>{load()},[]);

    const save=async(e)=>{
        e.preventDefault();
        try {
            if(editingId) {
                await updatePaciente(editingId, form);
                alert('Paciente Actualizado');
                setEditingId(null);
            } else {
                await crearPaciente(form);
                alert('Paciente Creado');
            }
            setForm({nombreCompleto:'',email:'',telefono:'', rut:''});
            load();
        } catch(e) { alert("Error al guardar paciente"); }
    };

    const handleEdit = (p) => {
        setForm({ nombreCompleto: p.nombreCompleto, email: p.email, telefono: p.telefono, rut: p.rut || '' });
        setEditingId(p.id);
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        if(confirm('¿Seguro que deseas eliminar este paciente?')) {
            await deletePaciente(id);
            load();
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({nombreCompleto:'',email:'',telefono:'', rut:''});
    }

    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Pacientes</h1></div></div>
            <div className="pro-card">
                <h3 style={{marginTop:0}}>{editingId ? 'Editar Paciente' : 'Crear Nuevo Paciente'}</h3>
                <form onSubmit={save}>
                    <div className="input-row">
                        <div><label className="form-label">RUT (Identificador)</label><input className="form-control" value={form.rut} onChange={e=>setForm({...form,rut:formatRut(e.target.value)})}/></div>
                        <div><label className="form-label">Nombre Completo</label><input className="form-control" value={form.nombreCompleto} onChange={e=>setForm({...form,nombreCompleto:e.target.value})}/></div>
                    </div>
                    <div className="input-row">
                        <div><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
                        <div><label className="form-label">Teléfono</label><input className="form-control" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></div>
                    </div>
                    <button className="btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Paciente'}</button>
                    {editingId && <button type="button" className="btn-edit" onClick={cancelEdit} style={{marginLeft:10}}>Cancelar Edición</button>}
                </form>
            </div>
            <h3>Directorio de Pacientes</h3>
            <div className="pro-card" style={{padding:0}}>
                <table className="data-table">
                    <thead><tr><th>RUT</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Acciones</th></tr></thead>
                    <tbody>{pacientes.map(p=>(
                        <tr key={p.id}>
                            {/* AQUÍ ESTABA EL ERROR: MOSTRAR p.rut */}
                            <td>{p.rut || '-'}</td>
                            <td>{p.nombreCompleto}</td>
                            <td>{p.email}</td>
                            <td>{p.telefono}</td>
                            <td>
                                <button className="btn-edit" onClick={()=>handleEdit(p)} style={{marginRight:5}}>Modificar</button>
                                <button className="btn-danger" onClick={()=>handleDelete(p.id)}>Eliminar</button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    )
}

function AgendaProfesionales() {
    const [pros, setPros] = useState([]);
    const [form, setForm] = useState({nombreCompleto:'', especialidad:''});
    const [selectedTreatments, setSelectedTreatments] = useState([]);
    
    const especialidadesUnicas = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const tratamientosDisponibles = form.especialidad ? TRATAMIENTOS.filter(t => t.especialidad === form.especialidad) : [];

    const load = () => getProfesionales().then(setPros);
    useEffect(() => { load(); }, []);

    const handleCheck = (tratamiento) => {
        if (selectedTreatments.includes(tratamiento)) {
            setSelectedTreatments(selectedTreatments.filter(t => t !== tratamiento));
        } else {
            setSelectedTreatments([...selectedTreatments, tratamiento]);
        }
    };

    const save = async (e) => {
        e.preventDefault();
        if(!form.especialidad) return alert("Selecciona especialidad");
        
        const payload = {
            nombreCompleto: form.nombreCompleto,
            especialidad: form.especialidad,
            tratamientos: selectedTreatments.join(',')
        };

        try {
            const res = await fetch(`${API_BASE_URL}/profesionales`, {
                method:'POST', 
                headers:{'Content-Type':'application/json'}, 
                body:JSON.stringify(payload)
            });
            
            if (res.status === 409) {
                return alert("Error: El profesional ya existe.");
            }
            if (!res.ok) throw new Error();

            alert('Profesional Guardado'); 
            setForm({nombreCompleto:'', especialidad:''}); 
            setSelectedTreatments([]);
            load();
        } catch(e) {
            alert("Error al guardar profesional");
        }
    }

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Profesionales</h1></div></div>
            <div className="pro-card">
                <form onSubmit={save}>
                    <div className="input-row">
                        <div><label className="form-label">Nombre Completo</label><input className="form-control" value={form.nombreCompleto} onChange={e=>setForm({...form, nombreCompleto:e.target.value})}/></div>
                        <div>
                            <label className="form-label">Especialidad</label>
                            <select className="form-control" value={form.especialidad} onChange={e=>{setForm({...form, especialidad:e.target.value}); setSelectedTreatments([]);}}>
                                <option value="">Seleccionar...</option>{especialidadesUnicas.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{marginBottom:20}}>
                        <label className="form-label">Tratamientos (Multiselección)</label>
                        {form.especialidad ? (
                            <div className="multicheck-container">
                                {tratamientosDisponibles.map(t => (
                                    <label key={t.id} className="check-item">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTreatments.includes(t.tratamiento)}
                                            onChange={() => handleCheck(t.tratamiento)}
                                        />
                                        {t.tratamiento}
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div style={{color:'#666', fontStyle:'italic'}}>Selecciona una especialidad primero...</div>
                        )}
                    </div>
                    <button className="btn-primary">Guardar Profesional</button>
                </form>
            </div>
            <h3>Staff Médico y Tratamientos</h3>
            <div className="pro-card" style={{padding:0}}>
                <table className="data-table">
                    <thead><tr><th>Nombre</th><th>Especialidad</th><th>Tratamientos Asignados</th></tr></thead>
                    <tbody>
                        {pros.map(p=>(
                            <tr key={p.id}>
                                <td>{p.nombreCompleto}</td>
                                <td>{p.especialidad}</td>
                                <td>
                                    <ul style={{margin:0, paddingLeft:20, fontSize:'0.8rem', color:'#666'}}>
                                        {/* FIX: Leer string tratamientos */}
                                        {p.tratamientos && p.tratamientos.length > 0 ? p.tratamientos.split(',').map((t, idx) => (
                                            <li key={idx}>{t}</li>
                                        )) : <li>Sin tratamientos asignados</li>}
                                    </ul>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function AgendaHorarios(){
    const [pros,setPros]=useState([]);
    const [configs, setConfigs] = useState([]);
    const [fechaSel, setFechaSel] = useState('');
    const [diaNombre, setDiaNombre] = useState('');
    const [form,setForm]=useState({profesionalId:'',diaSemana:'',horaInicio:'09:00',horaFin:'18:00', duracionSlot: 30, intervalo: 0});
    const [modalOpen, setModalOpen] = useState(false);
    const [horariosVisual, setHorariosVisual] = useState([]);
    const [proVisual, setProVisual] = useState('');

    useEffect(()=>{
        getProfesionales().then(setPros);
        loadConfigs();
    },[]);

    const loadConfigs = async () => {
        try {
            const data = await getConfiguraciones();
            setConfigs(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Error cargando configs", e);
            setConfigs([]);
        }
    };
    
    const handleFechaChange = (e) => {
        const fecha = e.target.value; setFechaSel(fecha);
        if (fecha) {
            // FIX: No usar objeto Date para diaNombre para evitar UTC shifts visuales
            const parts = fecha.split('-'); // YYYY-MM-DD
            // Truco: instanciar con horas para asegurar dia correcto
            const dateObj = new Date(parts[0], parts[1]-1, parts[2]);
            const diaIndex = dateObj.getDay(); 
            const nombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            setDiaNombre(nombres[diaIndex]);
            setForm({ ...form, diaSemana: diaIndex });
        } else { setDiaNombre(''); setForm({ ...form, diaSemana: '' }); }
    };

    const save=async(e)=>{
        e.preventDefault();
        if(!form.profesionalId || !fechaSel) return alert("Selecciona profesional y fecha"); 
        
        // Enviamos la fecha tal cual viene del input date (YYYY-MM-DD)
        const payload = { ...form, fecha: fechaSel }; 
        await fetch(`${API_BASE_URL}/configuracion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        
        alert(`Horario guardado para: ${fechaSel}`);
        await loadConfigs();
    };

    const borrarConfig = async (id) => {
        if(confirm("¿Eliminar esta regla de horario?")) {
            await deleteConfiguracion(id);
            loadConfigs();
        }
    }
    
    const abrirModal = async (p) => {
        setProVisual(p.nombreCompleto);
        try {
            const h = await getHorariosByProfesional(p.id);
            if(Array.isArray(h)) {
                // Agrupar
                const agrupados = h.reduce((acc, curr) => {
                    const f = curr.fecha.split('T')[0];
                    if(!acc[f]) acc[f] = [];
                    acc[f].push(curr);
                    return acc;
                }, {});
                setHorariosVisual(agrupados);
            } else { setHorariosVisual([]); }
            setModalOpen(true);
        } catch(e) { alert("Error cargando horarios"); }
    };

    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Configuración de Horarios</h1></div></div>
            <div className="pro-card">
                <form onSubmit={save}>
                    <div className="input-row">
                        <div><label className="form-label">Profesional</label><select className="form-control" onChange={e=>setForm({...form,profesionalId:e.target.value})}><option>Seleccionar...</option>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select></div>
                        <div><label className="form-label">Fecha del Bloque {diaNombre && <span>({diaNombre})</span>}</label><input type="date" className="form-control" value={fechaSel} onChange={handleFechaChange} /></div>
                    </div>
                    <div className="input-row">
                        <div><label className="form-label">Inicio</label><input type="time" className="form-control" value={form.horaInicio} onChange={e=>setForm({...form,horaInicio:e.target.value})}/></div>
                        <div><label className="form-label">Fin</label><input type="time" className="form-control" value={form.horaFin} onChange={e=>setForm({...form,horaFin:e.target.value})}/></div>
                    </div>
                    <div className="input-row">
                        <div>
                            <label className="form-label">Duración del Bloque (Minutos)</label>
                            <select className="form-control" value={form.duracionSlot} onChange={e=>setForm({...form, duracionSlot: e.target.value})}>
                                <option value="30">30 Minutos</option>
                                <option value="45">45 Minutos</option>
                                <option value="60">60 Minutos</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Tiempo de descanso / Intervalo (Minutos)</label>
                            <input type="number" className="form-control" value={form.intervalo} onChange={e=>setForm({...form, intervalo: e.target.value})} placeholder="Ej: 10"/>
                        </div>
                    </div>
                    <button className="btn-primary">Guardar Disponibilidad (Solo esta fecha)</button>
                </form>
            </div>

            <h3>Bloques de Atención Configurados (Por Fecha)</h3>
            <div className="pro-card" style={{padding:0}}>
                <table className="data-table">
                    <thead><tr><th>Profesional</th><th>Fecha</th><th>Horario</th><th>Duración / Intervalo</th><th>Acción</th></tr></thead>
                    <tbody>
                        {configs.map(c => (
                            <tr key={c.id}>
                                <td>{c.profesional?.nombreCompleto}</td>
                                <td>{c.fecha || 'Día genérico'}</td>
                                <td>{c.horaInicio} - {c.horaFin}</td>
                                <td>{c.duracionSlot}m / {c.intervalo}m gap</td>
                                <td><button className="btn-danger" onClick={()=>borrarConfig(c.id)}>Eliminar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <h3 style={{marginTop:40}}>Ver Calendario Visual</h3>
            <div className="pro-card" style={{padding:0}}>
                <table className="data-table">
                    <thead><tr><th>Profesional</th><th>Acción</th></tr></thead>
                    <tbody>
                        {pros.map(p=>(
                            <tr key={p.id}>
                                <td>{p.nombreCompleto}</td>
                                <td><button className="btn-edit" onClick={()=>abrirModal(p)}>Ver Horarios</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- PORTAL PARA EL POPUP --- */}
            {modalOpen && createPortal(
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={()=>setModalOpen(false)}>×</button>
                        <h2>Horarios: {proVisual}</h2>
                        <div style={{marginTop:20}}>
                            {Object.keys(horariosVisual).length === 0 ? <p>No hay horarios cargados.</p> : 
                                Object.entries(horariosVisual).sort().map(([fecha, slots]) => (
                                    <div key={fecha} style={{marginBottom:15, borderBottom:'1px solid #eee', paddingBottom:10}}>
                                        {/* Fix visualizacion fecha */}
                                        <strong style={{display:'block', marginBottom:5}}>{new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {weekday:'long', day:'numeric', month:'long'})}</strong>
                                        <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>
                                            {slots.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(s => (
                                                <span key={s.id} style={{background:'#f3f4f6', padding:'4px 8px', borderRadius:4, fontSize:'0.8rem'}}>
                                                    {new Date(s.fecha).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function AgendaNuevaReserva({ reload, reservas }) { return <div style={{padding:20}}>Vista Nueva Reserva (Simplificada)</div> }
function AgendaResumen({reservas, reload}){ return <div style={{padding:20}}>Vista Resumen (Simplificada)</div> } 
function FinanzasReporte({total,count,reservas}){ return <div style={{padding:20}}>Vista Finanzas (Simplificada)</div> }

// =========================================================
// WEB PACIENTE (ESTILO REDSALUD)
// =========================================================
function WebPaciente() {
    const [step, setStep] = useState(0); 
    const [profesionales, setProfesionales] = useState([]);
    const [form, setForm] = useState({ rut:'', nombre:'', email:'', telefono:'', especialidad:'', tratamientoId:'', profesionalId:'', horarioId:'' });
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [pacienteId, setPacienteId] = useState(null);
    
    // ESTADO PARA LA VISTA DE AGENDAS TIPO REDSALUD
    const [multiAgenda, setMultiAgenda] = useState({}); 
    const [selectedDateKey, setSelectedDateKey] = useState(null); 
    const [availableDates, setAvailableDates] = useState([]); 

    useEffect(()=>{ getProfesionales().then(setProfesionales) },[]);

    const especialidades = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const prestaciones = TRATAMIENTOS.filter(t => t.especialidad === form.especialidad);
    const tratamientoSel = TRATAMIENTOS.find(t => t.id === parseInt(form.tratamientoId));
    
    // BUSQUEDA INTELIGENTE DE DISPONIBILIDAD
    const handleTreatmentConfirm = async () => {
        setLoading(true);
        const prosAptos = profesionales.filter(p => p.tratamientos && p.tratamientos.includes(tratamientoSel.tratamiento));
        
        if (prosAptos.length === 0) {
            alert("No hay profesionales asignados a este tratamiento.");
            setLoading(false);
            return;
        }

        const promises = prosAptos.map(async p => {
            const horarios = await getHorariosByProfesional(p.id);
            return { 
                profesional: p, 
                slots: Array.isArray(horarios) ? horarios.filter(x => new Date(x.fecha) > new Date()) : [] 
            };
        });

        const results = await Promise.all(promises);
        const agendaMap = {};
        const datesSet = new Set();

        results.forEach(({profesional, slots}) => {
            slots.forEach(slot => {
                const dateKey = toDateKey(slot.fecha); // Usamos el helper YYYY-MM-DD
                datesSet.add(dateKey);
                if (!agendaMap[dateKey]) agendaMap[dateKey] = [];
                let proEntry = agendaMap[dateKey].find(entry => entry.profesional.id === profesional.id);
                if (!proEntry) {
                    proEntry = { profesional, slots: [] };
                    agendaMap[dateKey].push(proEntry);
                }
                proEntry.slots.push(slot);
            });
        });

        const sortedDates = Array.from(datesSet).sort();
        setMultiAgenda(agendaMap);
        setAvailableDates(sortedDates);
        if (sortedDates.length > 0) setSelectedDateKey(sortedDates[0]);
        
        setLoading(false);
        setStep(3); 
    };

    const handleRutSearch = async () => {
        if(!form.rut) return alert("Ingrese su RUT");
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
        } catch(e) { alert('Error al reservar.'); }
        setLoading(false);
    }

    if(bookingSuccess) {
        return (
            <div className="web-shell">
                <div className="success-view">
                    <div className="success-icon">✓</div>
                    <h1>¡Reserva Exitosa!</h1>
                    <div className="web-card" style={{margin:'30px 0', textAlign:'center'}}>
                        <h3 style={{marginTop:0}}>{tratamientoSel?.tratamiento}</h3>
                        <p>Se ha enviado un correo a {form.email}</p>
                    </div>
                    <button className="web-btn-black" onClick={()=>window.location.reload()}>Volver al Inicio</button>
                </div>
            </div>
        )
    }

    return (
        <div className="web-shell">
            <img src={LOGO_URL} alt="CISD Logo" className="cisd-logo-web" />
            {step > 0 && <div className="stepper"><div className="step-line"></div>{STEPS.map(s => <div key={s.n} className={`step-dot ${step>=s.n?'active':''}`}>{s.n}</div>)}</div>}
            <div className="web-card">
                {step===0 && (
                    <div className="fade-in">
                        <h2 style={{marginTop:0}}>Bienvenido</h2>
                        <div className="input-group" style={{marginBottom:20}}><label className="form-label">RUT</label><input className="cisd-input" placeholder="Ej: 12345678-9" value={form.rut} onChange={e=>setForm({...form, rut:formatRut(e.target.value)})}/></div>
                        <button className="web-btn-black" style={{width:'100%'}} disabled={!form.rut || loading} onClick={handleRutSearch}>{loading ? '...' : 'Comenzar'}</button>
                    </div>
                )}
                {step===1 && (
                    <div className="fade-in">
                        <h2 style={{marginTop:0}}>Registro</h2>
                        <div className="input-group" style={{marginBottom:15}}><label className="form-label">Nombre</label><input className="cisd-input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})}/></div>
                        <div className="input-group" style={{marginBottom:15}}><label className="form-label">Email</label><input className="cisd-input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/></div>
                        <div className="input-group" style={{marginBottom:20}}><label className="form-label">Teléfono</label><input className="cisd-input" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})}/></div>
                        <div className="web-actions"><button className="web-btn-white" onClick={()=>setStep(0)}>Volver</button><button className="web-btn-black" disabled={!form.nombre} onClick={()=>setStep(2)}>Continuar</button></div>
                    </div>
                )}
                {step===2 && (
                    <div className="fade-in">
                        <h2 style={{marginTop:0}}>¿Qué necesitas?</h2>
                        <div className="input-group" style={{marginBottom:20}}>
                            <label className="form-label">Especialidad</label>
                            <select className="cisd-select" onChange={e=>setForm({...form, especialidad:e.target.value})}>
                                <option>Seleccionar...</option>{especialidades.map(e=><option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div className="input-group" style={{marginBottom:20}}>
                            <label className="form-label">Tratamiento</label>
                            <select className="cisd-select" disabled={!form.especialidad} onChange={e=>setForm({...form, tratamientoId:e.target.value})}>
                                <option>Seleccionar...</option>{prestaciones.map(p=><option key={p.id} value={p.id}>{p.tratamiento}</option>)}
                            </select>
                        </div>
                        <div className="web-actions">
                            <button className="web-btn-white" onClick={()=>setStep(0)}>Volver</button>
                            <button className="web-btn-black" disabled={!form.tratamientoId || loading} onClick={handleTreatmentConfirm}>
                                {loading ? 'Buscando horas...' : 'Ver Disponibilidad'}
                            </button>
                        </div>
                    </div>
                )}
                {step===3 && (
                    <div className="fade-in">
                        <h2 style={{marginTop:0}}>Selecciona Hora</h2>
                        {availableDates.length === 0 ? <p>No hay horas disponibles.</p> : (
                            <>
                                <div className="rs-date-tabs">
                                    {availableDates.map(dateStr => {
                                        // Fix visualización tabs
                                        const dateObj = new Date(dateStr + 'T00:00:00');
                                        return (
                                            <div key={dateStr} className={`rs-date-tab ${selectedDateKey === dateStr ? 'selected' : ''}`} onClick={() => setSelectedDateKey(dateStr)}>
                                                <div className="rs-day-name">{dateObj.toLocaleDateString('es-CL', {weekday: 'short'})}</div>
                                                <div className="rs-day-number">{dateObj.getDate()}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="rs-pro-list">
                                    {multiAgenda[selectedDateKey]?.map((entry) => (
                                        <div key={entry.profesional.id} className="rs-pro-card">
                                            <div className="rs-pro-info">
                                                <div className="rs-avatar">{entry.profesional.nombreCompleto.charAt(0)}</div>
                                                <div className="rs-pro-name">{entry.profesional.nombreCompleto}</div>
                                                <div className="rs-pro-spec">{entry.profesional.especialidad}</div>
                                            </div>
                                            <div className="rs-slots-area">
                                                <div className="rs-slots-grid">
                                                    {entry.slots.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(slot => (
                                                        <button key={slot.id} className="rs-slot-btn" onClick={() => selectSlot(entry.profesional.id, slot.id)}>
                                                            {new Date(slot.fecha).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <div className="web-actions" style={{marginTop:30}}><button className="web-btn-white" onClick={()=>setStep(2)}>Volver</button></div>
                    </div>
                )}
                {step===4 && (
                    <div className="fade-in">
                        <h2 style={{marginTop:0}}>Confirmar</h2>
                        <div style={{border:'1px solid #eee', padding:20, borderRadius:12, marginBottom:20}}>
                            <p><strong>Paciente:</strong> {form.nombre}</p>
                            <p><strong>Tratamiento:</strong> {tratamientoSel?.tratamiento}</p>
                            <p><strong>Total:</strong> {tratamientoSel ? fmtMoney(tratamientoSel.valor) : ''}</p>
                        </div>
                        <div className="web-actions">
                            <button className="web-btn-white" onClick={()=>setStep(3)}>Volver</button>
                            <button className="web-btn-black" disabled={loading} onClick={confirmar}>Confirmar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;