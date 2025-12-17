import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './App.css'; 
import {
    API_BASE_URL, getPacientes, getProfesionales, getHorariosByProfesional,
    getReservasDetalle, crearReserva, crearPaciente, cancelarReserva, reagendarReserva,
    updatePaciente, deletePaciente, getConfiguraciones, deleteConfiguracion,
    buscarPacientePorRut, updateProfesional, deleteProfesional
} from './api';

// --- DATA MAESTRA ---
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleNavClick = (view) => {
        setActiveView(view);
        setMobileMenuOpen(false); 
    }
    
    return (
        <div className="dashboard-layout">
            <nav className="top-nav">
                <div className="brand-area">
                    {/* Botón Hamburguesa */}
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
                {/* Overlay oscuro (solo móvil) */}
                {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>}

                <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">MENÚ {activeModule === 'agenda' ? 'AGENDA' : 'FINANZAS'}</div>
                    {activeModule === 'agenda' && (
                        <>
                            <div className={`nav-item ${activeView==='resumen'?'active':''}`} onClick={()=>handleNavClick('resumen')}>Resumen Agendamientos</div>
                            <div className={`nav-item ${activeView==='reservas'?'active':''}`} onClick={()=>handleNavClick('reservas')}>Nueva Reserva</div>
                            <div className={`nav-item ${activeView==='pacientes'?'active':''}`} onClick={()=>handleNavClick('pacientes')}>Administrar Pacientes</div>
                            <div className={`nav-item ${activeView==='profesionales'?'active':''}`} onClick={()=>handleNavClick('profesionales')}>Administrar Profesionales</div>
                            <div className={`nav-item ${activeView==='horarios'?'active':''}`} onClick={()=>handleNavClick('horarios')}>Administrar Horarios</div>
                        </>
                    )}
                    {activeModule === 'finanzas' && <div className={`nav-item ${activeView==='reporte'?'active':''}`} onClick={()=>handleNavClick('reporte')}>Dashboard Financiero</div>}
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

// ---------------------- SUBVISTAS ----------------------

function AgendaNuevaReserva({ reload, reservas }) {
    const [pacientes, setPacientes] = useState([]);
    const [pros, setPros] = useState([]);
    const [horarios, setHorarios] = useState([]);
    const [form, setForm] = useState({ pacienteId: '', profesionalId: '', horarioId: '', motivo: '', especialidad: '', tratamientoId: '' });

    useEffect(() => { getPacientes().then(setPacientes); getProfesionales().then(setPros); }, []);

    const especialidades = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const prestaciones = TRATAMIENTOS.filter(t => t.especialidad === form.especialidad);

    const prosFiltrados = form.tratamientoId
        ? pros.filter(p => {
            const trat = TRATAMIENTOS.find(x => x.id === parseInt(form.tratamientoId));
            return trat && p.tratamientos && p.tratamientos.includes(trat.tratamiento);
        })
        : [];

    const handlePro = async (pid) => {
        setForm({ ...form, profesionalId: pid });
        setHorarios([]);
        if (!pid || pid === "") return; 
        try {
            const h = await getHorariosByProfesional(pid);
            if (Array.isArray(h)) { setHorarios(h); } else { setHorarios([]); }
        } catch(e) { setHorarios([]); }
    }

    const save = async (e) => {
        e.preventDefault();
        if (!form.tratamientoId) return alert("Tratamiento obligatorio");
        const trat = TRATAMIENTOS.find(t => t.id === parseInt(form.tratamientoId));
        try {
            await crearReserva({ pacienteId: parseInt(form.pacienteId), profesionalId: parseInt(form.profesionalId), horarioDisponibleId: form.horarioId, motivo: trat.tratamiento });
            alert('Creada con éxito'); reload();
        } catch (e) { alert('Error al crear reserva'); }
    };

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Nueva Reserva Manual</h1></div></div>
            <div className="pro-card">
                <form onSubmit={save}>
                    <div className="input-row">
                        <div>
                            <label className="form-label">Especialidad</label>
                            <select className="form-control" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value, tratamientoId: '' })}>
                                <option value="">Seleccionar...</option>{especialidades.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Tratamiento</label>
                            <select className="form-control" disabled={!form.especialidad} onChange={e => setForm({ ...form, tratamientoId: e.target.value })}>
                                <option value="">Seleccionar...</option>{prestaciones.map(t => <option key={t.id} value={t.id}>{t.tratamiento}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="input-row">
                        <div>
                            <label className="form-label">Paciente</label>
                            <select className="form-control" onChange={e => setForm({ ...form, pacienteId: e.target.value })}>
                                <option value="">Seleccionar...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto} ({p.rut})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Profesional</label>
                            <select className="form-control" disabled={!form.tratamientoId} onChange={e => handlePro(e.target.value)}>
                                <option value="">Seleccionar...</option>{prosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label className="form-label">Horario</label>
                        <select className="form-control" onChange={e => setForm({ ...form, horarioId: e.target.value })}>
                            <option value="">Seleccionar...</option>
                            {Array.isArray(horarios) && horarios.map(h => <option key={h.id} value={h.id}>{fmtDate(h.fecha)}</option>)}
                        </select>
                    </div>
                    <button className="btn-primary">Crear Reserva</button>
                </form>
            </div>
            <h3 style={{ marginTop: 40 }}>Reservas Recientes</h3>
            <div className="pro-card" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead><tr><th>Fecha</th><th>Paciente</th><th>Profesional</th></tr></thead>
                    <tbody>
                        {reservas.slice(0, 5).map(r => (<tr key={r.id}><td>{fmtDate(r.fecha)}</td><td>{r.pacienteNombre}</td><td>{r.profesionalNombre}</td></tr>))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function AgendaResumen({reservas, reload}){
    const [editId,setEditId]=useState(null);
    const [editPro,setEditPro]=useState('');
    const [editHorario,setEditHorario]=useState('');
    const [editTratamiento, setEditTratamiento] = useState('');
    const [pros,setPros]=useState([]);
    const [horarios,setHorarios]=useState([]);

    useEffect(()=>{getProfesionales().then(setPros)},[]);

    const startEdit=async(r)=>{
        setEditId(r.id);
        setEditPro(r.profesionalId);
        setEditTratamiento(r.motivo);
        const h=await getHorariosByProfesional(r.profesionalId);
        setHorarios(Array.isArray(h) ? h : []);
    };

    const handleProChange=async(pid)=>{
        setEditPro(pid);
        setEditTratamiento(''); 
        const h=await getHorariosByProfesional(pid);
        setHorarios(Array.isArray(h) ? h : []);
    };

    const saveEdit=async(id)=>{
        if(!editHorario) return alert('Selecciona hora');
        try{
            await reagendarReserva(id, editHorario, editPro, editTratamiento);
            alert('Modificado con éxito');
            setEditId(null);
            reload();
        }catch(e){alert('Error al modificar')}
    };

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Resumen de Agendamientos</h1></div></div>
            <div className="pro-card" style={{padding:0, overflowX:'auto'}}>
                <table className="data-table">
                    <thead><tr><th>Fecha</th><th>Paciente</th><th>Profesional</th><th>Tratamiento</th><th>Valor</th><th>Acciones</th></tr></thead>
                    <tbody>{reservas.map(r=>{
                        const match=TRATAMIENTOS.find(t=>r.motivo.includes(t.tratamiento));
                        const valor = match ? match.valor : 0;

                        if(editId===r.id) return (
                            <tr key={r.id} style={{background:'#fdf2f8'}}>
                                <td colSpan={5}>
                                    <div style={{display:'flex', flexDirection:'column', gap:10}}>
                                        <div style={{display:'flex', gap:10}}>
                                            <select className="form-control" value={editPro} onChange={e=>handleProChange(e.target.value)}>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select>
                                            <select className="form-control" value={editHorario} onChange={e=>setEditHorario(e.target.value)}><option value="">Selecciona hora...</option>{horarios.map(h=><option key={h.id} value={h.id}>{fmtDate(h.fecha)}</option>)}</select>
                                        </div>
                                    </div>
                                </td>
                                <td><button className="btn-primary" onClick={()=>saveEdit(r.id)}>Guardar</button><button className="btn-edit" onClick={()=>setEditId(null)}>X</button></td>
                            </tr>
                        );

                        return(
                            <tr key={r.id}>
                                <td>{fmtDate(r.fecha)}</td>
                                <td><strong>{r.pacienteNombre}</strong><br/><small>{r.pacienteEmail}</small></td>
                                <td>{r.profesionalNombre}</td>
                                <td>{r.motivo}</td>
                                <td>{fmtMoney(valor)}</td>
                                <td>
                                    <button className="btn-edit" onClick={()=>startEdit(r)} style={{marginRight:5}}>Modificar</button>
                                    <button className="btn-danger" onClick={async()=>{if(confirm('¿Eliminar?')){await cancelarReserva(r.id);reload()}}}>Eliminar</button>
                                </td>
                            </tr>
                        )
                    })}</tbody>
                </table>
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
    // Formulario ahora maneja Arrays para especialidades y tratamientos
    const [form, setForm] = useState({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] });
    const [isEditing, setIsEditing] = useState(false);

    const especialidadesUnicas = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    
    // Filtrar tratamientos basado en TODAS las especialidades seleccionadas
    const tratamientosDisponibles = TRATAMIENTOS.filter(t => 
        form.especialidades.includes(t.especialidad)
    );

    const load = () => getProfesionales().then(setPros);
    useEffect(() => { load(); }, []);

    // Manejo de Checkbox Especialidades
    const handleSpecCheck = (esp) => {
        if (form.especialidades.includes(esp)) {
            // Si ya está, lo quitamos y también limpiamos los tratamientos de esa especialidad
            const nuevasEsp = form.especialidades.filter(e => e !== esp);
            const tratamientosMantener = form.tratamientos.filter(t => {
                const match = TRATAMIENTOS.find(tr => tr.tratamiento === t);
                return match && nuevasEsp.includes(match.especialidad);
            });
            setForm({ ...form, especialidades: nuevasEsp, tratamientos: tratamientosMantener });
        } else {
            // Si no está, lo agregamos
            setForm({ ...form, especialidades: [...form.especialidades, esp] });
        }
    };

    // Manejo de Checkbox Tratamientos
    const handleTratCheck = (trat) => {
        if (form.tratamientos.includes(trat)) {
            setForm({ ...form, tratamientos: form.tratamientos.filter(t => t !== trat) });
        } else {
            setForm({ ...form, tratamientos: [...form.tratamientos, trat] });
        }
    };

    // Cargar datos para editar
    const handleEdit = (p) => {
        setForm({
            id: p.id,
            nombreCompleto: p.nombreCompleto,
            // Convertimos los strings guardados "A,B" en arrays ["A","B"]
            especialidades: p.especialidad ? p.especialidad.split(',') : [],
            tratamientos: p.tratamientos ? p.tratamientos.split(',') : []
        });
        setIsEditing(true);
        window.scrollTo(0,0);
    };

    const handleDelete = async (id) => {
        if(confirm('¿Eliminar este profesional? Se borrarán sus configuraciones de horario.')) {
            await deleteProfesional(id);
            load();
        }
    };

    const cancelEdit = () => {
        setForm({ id: null, nombreCompleto: '', especialidades: [], tratamientos: [] });
        setIsEditing(false);
    };

    const save = async (e) => {
        e.preventDefault();
        if (form.especialidades.length === 0) return alert("Selecciona al menos una especialidad");

        const payload = {
            nombreCompleto: form.nombreCompleto,
            // Guardamos como String separado por comas
            especialidad: form.especialidades.join(','), 
            tratamientos: form.tratamientos.join(',')
        };

        try {
            if (isEditing) {
                await updateProfesional(form.id, payload);
                alert('Profesional Actualizado Correctamente');
            } else {
                const res = await fetch(`${API_BASE_URL}/profesionales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.status === 409) return alert("Error: El profesional ya existe.");
                if (!res.ok) throw new Error();
                alert('Profesional Creado');
            }
            cancelEdit();
            load();
        } catch (e) {
            alert("Error al guardar");
        }
    }

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Gestión de Profesionales</h1></div></div>
            <div className="pro-card">
                <h3 style={{marginTop:0}}>{isEditing ? 'Editar Profesional' : 'Nuevo Profesional'}</h3>
                <form onSubmit={save}>
                    <div className="input-row" style={{marginBottom:15}}>
                        <div style={{width:'100%'}}>
                            <label className="form-label">Nombre Completo</label>
                            <input className="form-control" value={form.nombreCompleto} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label className="form-label">Especialidades (Puedes marcar varias)</label>
                        <div className="multicheck-container" style={{ maxHeight: '150px' }}>
                            {especialidadesUnicas.map(esp => (
                                <label key={esp} className="check-item">
                                    <input
                                        type="checkbox"
                                        checked={form.especialidades.includes(esp)}
                                        onChange={() => handleSpecCheck(esp)}
                                    />
                                    <strong>{esp}</strong>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label className="form-label">Tratamientos Disponibles (Según especialidades)</label>
                        {form.especialidades.length > 0 ? (
                            <div className="multicheck-container">
                                {tratamientosDisponibles.map(t => (
                                    <label key={t.id} className="check-item">
                                        <input
                                            type="checkbox"
                                            checked={form.tratamientos.includes(t.tratamiento)}
                                            onChange={() => handleTratCheck(t.tratamiento)}
                                        />
                                        {t.tratamiento} <small style={{color:'#888'}}>({t.especialidad})</small>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: '#666', fontStyle: 'italic', padding: 10, background: '#f9f9f9', borderRadius: 8 }}>
                                Selecciona una especialidad arriba para ver los tratamientos...
                            </div>
                        )}
                    </div>

                    <div style={{display:'flex', gap:10}}>
                        <button className="btn-primary">{isEditing ? 'Guardar Cambios' : 'Crear Profesional'}</button>
                        {isEditing && <button type="button" className="btn-edit" onClick={cancelEdit}>Cancelar</button>}
                    </div>
                </form>
            </div>

            <h3>Staff Médico</h3>
            <div className="pro-card" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead><tr><th>Nombre</th><th>Especialidades</th><th>Tratamientos</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {pros.map(p => (
                            <tr key={p.id}>
                                <td><strong>{p.nombreCompleto}</strong></td>
                                <td>
                                    {p.especialidad ? p.especialidad.split(',').map((e, i) => (
                                        <span key={i} style={{display:'block', fontSize:'0.85rem', marginBottom:2}}>• {e}</span>
                                    )) : '-'}
                                </td>
                                <td>
                                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.8rem', color: '#666' }}>
                                        {p.tratamientos && p.tratamientos.length > 0 ? p.tratamientos.split(',').map((t, idx) => (
                                            <li key={idx}>{t}</li>
                                        )) : <li>Sin tratamientos</li>}
                                    </ul>
                                </td>
                                <td>
                                    <div style={{display:'flex', gap:5}}>
                                        <button className="btn-edit" onClick={() => handleEdit(p)}>Editar</button>
                                        <button className="btn-danger" onClick={() => handleDelete(p.id)}>X</button>
                                    </div>
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
            const parts = fecha.split('-'); 
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

            {modalOpen && createPortal(
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={()=>setModalOpen(false)}>×</button>
                        <h2>Horarios: {proVisual}</h2>
                        <div style={{marginTop:20}}>
                            {Object.keys(horariosVisual).length === 0 ? <p>No hay horarios cargados.</p> : 
                                Object.entries(horariosVisual).sort().map(([fecha, slots]) => (
                                    <div key={fecha} style={{marginBottom:15, borderBottom:'1px solid #eee', paddingBottom:10}}>
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

function FinanzasReporte({total,count,reservas}){
    return(
        <div>
            <div className="page-header"><div className="page-title"><h1>Reporte Financiero</h1></div></div>
            <div className="kpi-grid">
                <div className="kpi-box">
                    <div className="kpi-label">Ingresos Totales</div>
                    <div className="kpi-value">{fmtMoney(total)}</div>
                </div>
                <div className="kpi-box">
                    <div className="kpi-label">Citas Agendadas</div>
                    <div className="kpi-value">{count}</div>
                </div>
            </div>
            <div className="pro-card" style={{padding:0}}>
                <table className="data-table">
                    <thead><tr><th>Fecha</th><th>Paciente</th><th>Tratamiento</th><th>Valor</th></tr></thead>
                    <tbody>
                        {reservas.map(r=>{
                            const match=TRATAMIENTOS.find(t=>r.motivo.includes(t.tratamiento));
                            return(
                                <tr key={r.id}>
                                    <td>{fmtDate(r.fecha)}</td>
                                    <td>{r.pacienteNombre}</td>
                                    <td>{r.motivo}</td>
                                    <td><b>{match?fmtMoney(match.valor):'-'}</b></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
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
                const dateKey = toDateKey(slot.fecha);
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