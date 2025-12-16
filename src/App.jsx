import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './App.css';
import {
    API_BASE_URL, getPacientes, getProfesionales, getHorariosByProfesional,
    getReservasDetalle, crearReserva, crearPaciente, cancelarReserva, reagendarReserva,
    updatePaciente, deletePaciente, getConfiguraciones, deleteConfiguracion,
    buscarPacientePorRut
} from './api';

// --- DATA MAESTRA ---
const TRATAMIENTOS = [
    { id: 1, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto online', codigo: '13-02-2003', descripcion: 'Evaluación de voz, habla y lenguaje', valor: 20000, profesionalesIds: [1] },
    { id: 2, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto presencial', codigo: '13-02-2003', descripcion: 'Evaluación de voz, habla y lenguaje (Providencia)', valor: 35000, profesionalesIds: [1] },
    { id: 3, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto domicilio - RM', codigo: '13-02-2003', descripcion: 'Evaluación en domicilio RM', valor: 30000, profesionalesIds: [1] },
    { id: 4, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Evaluación fonoaudiológica adulto domicilio - Alrededor RM', codigo: '13-02-2003', descripcion: 'Evaluación periferia RM', valor: 50000, profesionalesIds: [1] },
    { id: 5, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto online', codigo: '13-02-2004', descripcion: 'Reeducación de voz, habla y lenguaje', valor: 20000, profesionalesIds: [1] },
    { id: 6, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto presencial', codigo: '13-02-2004', descripcion: 'Consulta presencial Providencia', valor: 35000, profesionalesIds: [1] },
    { id: 7, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto domicilio - RM', codigo: '13-02-2004', descripcion: 'Consulta domicilio RM', valor: 30000, profesionalesIds: [1] },
    { id: 8, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Consulta fonoaudiológica adulto domicilio - Alrededor RM', codigo: '13-02-2004', descripcion: 'Consulta periferia RM', valor: 50000, profesionalesIds: [1] },
    { id: 9, especialidad: 'Fonoaudiología Adulto', tratamiento: 'Otoscopía + Lavado de oídos', codigo: '18-02-2006', descripcion: 'Procedimiento Lavado de Oídos', valor: 20000, profesionalesIds: [2] },

    { id: 10, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica infanto-juvenil online', codigo: '13-02-2003', descripcion: 'Evaluación de voz, habla y lenguaje infantil', valor: 20000, profesionalesIds: [1, 2] },
    { id: 11, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica presencial', codigo: '13-02-2003', descripcion: 'Evaluación presencial Providencia', valor: 35000, profesionalesIds: [2] },
    { id: 12, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica domicilio - RM', codigo: '13-02-2003', descripcion: 'Evaluación domicilio RM', valor: 30000, profesionalesIds: [1, 2] },
    { id: 13, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Evaluación fonoaudiológica domicilio - Alrededor RM', codigo: '13-02-2003', descripcion: 'Evaluación periferia RM', valor: 50000, profesionalesIds: [1] },
    { id: 14, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica online', codigo: '13-02-2004', descripcion: 'Reeducación de voz y lenguaje', valor: 20000, profesionalesIds: [1, 2] },
    { id: 15, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica presencial', codigo: '13-02-2004', descripcion: 'Consulta presencial Providencia', valor: 35000, profesionalesIds: [2] },
    { id: 16, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica domicilio - RM', codigo: '13-02-2004', descripcion: 'Consulta domicilio RM', valor: 30000, profesionalesIds: [1, 2] },
    { id: 17, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Consulta fonoaudiológica domicilio - Alrededor RM', codigo: '13-02-2004', descripcion: 'Consulta periferia RM', valor: 50000, profesionalesIds: [1] },
    { id: 18, especialidad: 'Fonoaudiología Infanto-Juvenil', tratamiento: 'Otoscopía + Lavado de oídos', codigo: '18-02-2006', descripcion: 'Procedimiento Lavado Infantil', valor: 20000, profesionalesIds: [2] },

    { id: 19, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Online', codigo: '09-02-2001', descripcion: 'Psicodiagnóstico', valor: 25000, profesionalesIds: [3, 4] },
    { id: 20, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Presencial - Stgo Centro', codigo: '09-02-2001', descripcion: 'Psicodiagnóstico Presencial', valor: 35000, profesionalesIds: [3, 4] },
    { id: 21, especialidad: 'Psicología Adulto', tratamiento: 'Evaluación Psicología Adulto Presencial - Providencia', codigo: '09-02-2001', descripcion: 'Psicodiagnóstico Presencial', valor: 35000, profesionalesIds: [3, 5] },
    { id: 24, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto online', codigo: '09-02-2002', descripcion: 'Psicoterapia Individual', valor: 25000, profesionalesIds: [3, 4] },
    { id: 25, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto Presencial - Stgo Centro', codigo: '09-02-2002', descripcion: 'Psicoterapia Presencial', valor: 35000, profesionalesIds: [3, 4] },
    { id: 26, especialidad: 'Psicología Adulto', tratamiento: 'Consulta Psicología Adulto Presencial - Providencia', codigo: '09-02-2002', descripcion: 'Psicoterapia Presencial', valor: 35000, profesionalesIds: [3, 5] },

    { id: 29, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil online', codigo: '09-02-2001', descripcion: 'Psicodiagnóstico Infantil', valor: 25000, profesionalesIds: [3, 4] },
    { id: 30, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil Presencial - Stgo Centro', codigo: '09-02-2001', descripcion: 'Psicodiagnóstico Infantil', valor: 35000, profesionalesIds: [3, 4] },
    { id: 31, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Evaluación Psicología infanto-juvenil Presencial - Providencia', codigo: '09-02-2001', descripcion: 'Psicodiagnóstico Infantil', valor: 35000, profesionalesIds: [3, 5] },
    { id: 34, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil online', codigo: '09-02-2002', descripcion: 'Psicoterapia Individual Infantil', valor: 25000, profesionalesIds: [3, 4] },
    { id: 35, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil Presencial - Stgo Centro', codigo: '09-02-2002', descripcion: 'Psicoterapia Individual Infantil', valor: 35000, profesionalesIds: [3, 4] },
    { id: 36, especialidad: 'Psicología Infanto-Juvenil', tratamiento: 'Consulta Psicología infanto-juvenil Presencial - Providencia', codigo: '09-02-2002', descripcion: 'Psicoterapia Individual Infantil', valor: 35000, profesionalesIds: [3, 5] },

    { id: 39, especialidad: 'Matrona', tratamiento: 'Ginecología Infanto-Juvenil', codigo: '11-01-1942', descripcion: 'Consulta Matrona', valor: 16000, profesionalesIds: [6] },
    { id: 41, especialidad: 'Matrona', tratamiento: 'Ginecología General', codigo: '11-01-1942', descripcion: 'Consulta Matrona General', valor: 16000, profesionalesIds: [6] },
    { id: 45, especialidad: 'Matrona', tratamiento: 'Asesoría de Lactancia', codigo: '11-01-1942', descripcion: 'Consulta Lactancia', valor: 16000, profesionalesIds: [6] },

    { id: 54, especialidad: 'Psicopedagogía', tratamiento: 'Evaluación Psicopedagógica Online', codigo: 'PARTICULAR', descripcion: 'Evaluación Psicopedagógica', valor: 20000, profesionalesIds: [7] },
    { id: 55, especialidad: 'Psicopedagogía', tratamiento: 'Sesión Psicopedagogía Online', codigo: 'PARTICULAR', descripcion: 'Sesión Psicopedagógica', valor: 20000, profesionalesIds: [7] },
];

const STEPS = [ {n:1, t:'Datos'}, {n:2, t:'Servicio'}, {n:3, t:'Hora'}, {n:4, t:'Confirmar'} ];

// Utils
const fmtMoney = (v) => `$${v.toLocaleString('es-CL')}`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('es-CL', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '-';
const toDateKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const formatRut = (rut) => rut.replace(/[^0-9kK]/g, '').toUpperCase();
const LOGO_URL = "https://cisd.cl/wp-content/uploads/2024/12/Logo-png-negro-150x150.png";

// --- ROUTER ---
function App() {
    if (window.location.pathname.startsWith('/centro')) return <AdminLayout />;
    return <WebPaciente />;
}

// =========================================================
// PANEL ADMIN (RESTAURADO)
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
    
    const refreshData = async () => {
        try { const data = await getReservasDetalle(); setReservas(data); } catch(e) { console.error(e); }
    };
    useEffect(() => { refreshData(); }, []);

    if (module === 'agenda') {
        if (view === 'resumen') return <AgendaResumen reservas={reservas} reload={refreshData} />;
        if (view === 'reservas') return <AgendaNuevaReserva reload={refreshData} reservas={reservas} />;
        if (view === 'pacientes') return <AgendaPacientes />;
        if (view === 'profesionales') return <AgendaProfesionales />;
        if (view === 'horarios') return <AgendaHorarios />;
    }
    if (module === 'finanzas') {
        const total = reservas.reduce((acc, r) => {
            const m = TRATAMIENTOS.find(t => r.motivo.includes(t.tratamiento));
            return acc + (m ? m.valor : 0);
        }, 0);
        return <FinanzasReporte total={total} count={reservas.length} reservas={reservas} />;
    }
    return <div>Cargando...</div>;
}

// ---------------------- SUBVISTAS ADMIN (RESTAURADAS) ----------------------

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
            const t = TRATAMIENTOS.find(x => x.id === parseInt(form.tratamientoId));
            return t && t.profesionalesIds.includes(p.id);
        })
        : [];

    const handlePro = async (pid) => {
        setForm({ ...form, profesionalId: pid });
        setHorarios([]);
        
        if (!pid || pid === "") return; 

        try {
            const h = await getHorariosByProfesional(pid);
            if (Array.isArray(h)) {
                setHorarios(h);
            } else {
                setHorarios([]);
            }
        } catch(e) {
            setHorarios([]);
        }
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

    const tratamientosFiltrados = editPro ? TRATAMIENTOS.filter(t => t.profesionalesIds.includes(parseInt(editPro))) : TRATAMIENTOS;

    return (
        <div>
            <div className="page-header"><div className="page-title"><h1>Resumen de Agendamientos</h1></div></div>
            <div className="pro-card" style={{padding:0, overflowX:'auto'}}>
                <table className="data-table">
                    <thead><tr><th>Fecha</th><th>Paciente</th><th>Profesional</th><th>Tratamiento</th><th>Código</th><th>Descripción</th><th>Valor</th><th>Acciones</th></tr></thead>
                    <tbody>{reservas.map(r=>{
                        const match=TRATAMIENTOS.find(t=>r.motivo.includes(t.tratamiento));
                        const tratamiento = match ? match.tratamiento : r.motivo;
                        const codigo = match ? match.codigo : '-';
                        const desc = match ? match.descripcion : '-';
                        const valor = match ? match.valor : 0;

                        if(editId===r.id) return (
                            <tr key={r.id} style={{background:'#fdf2f8'}}>
                                <td colSpan={7}>
                                    <div style={{display:'flex', flexDirection:'column', gap:10}}>
                                        <div style={{display:'flex', gap:10}}>
                                            <select className="form-control" value={editPro} onChange={e=>handleProChange(e.target.value)}>{pros.map(p=><option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}</select>
                                            <select className="form-control" value={editHorario} onChange={e=>setEditHorario(e.target.value)}><option value="">Selecciona hora...</option>{horarios.map(h=><option key={h.id} value={h.id}>{fmtDate(h.fecha)}</option>)}</select>
                                        </div>
                                        <select className="form-control" value={editTratamiento} onChange={e=>setEditTratamiento(e.target.value)}>
                                            {tratamientosFiltrados.map(t=><option key={t.id} value={t.tratamiento}>{t.tratamiento}</option>)}
                                        </select>
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
                                <td>{tratamiento}</td>
                                <td>{codigo}</td>
                                <td>{desc}</td>
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
    };

    const handleEdit = (p) => {
        setForm({ nombreCompleto: p.nombreCompleto, email: p.email, telefono: p.telefono, rut: p.rut || '' });
        setEditingId(p.id);
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        if(confirm('¿Seguro que deseas eliminar este paciente? Se borrarán todas sus reservas.')) {
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
    const [form, setForm] = useState({nombreCompleto:'', especialidad:'', tratamientoVinculado: ''});
    
    const especialidadesUnicas = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const tratamientosFiltrados = form.especialidad ? TRATAMIENTOS.filter(t => t.especialidad === form.especialidad) : [];

    const load = () => getProfesionales().then(setPros);
    useEffect(() => { load(); }, []);

    const save = async (e) => {
        e.preventDefault();
        if(!form.especialidad) return alert("Selecciona especialidad");
        await fetch(`${API_BASE_URL}/profesionales`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nombreCompleto: form.nombreCompleto, especialidad: form.especialidad})});
        alert('Profesional Guardado'); setForm({nombreCompleto:'', especialidad:'', tratamientoVinculado: ''}); load();
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
                            <select className="form-control" value={form.especialidad} onChange={e=>setForm({...form, especialidad:e.target.value, tratamientoVinculado: ''})}>
                                <option value="">Seleccionar...</option>{especialidadesUnicas.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{marginBottom:20}}>
                        <label className="form-label">Tratamientos Asociados a la Especialidad</label>
                        <select className="form-control" value={form.tratamientoVinculado} onChange={e=>setForm({...form, tratamientoVinculado:e.target.value})} disabled={!form.especialidad}>
                            <option value="">(Todos los de la especialidad)</option>
                            {tratamientosFiltrados.map(t => <option key={t.id} value={t.tratamiento}>{t.tratamiento}</option>)}
                        </select>
                    </div>
                    <button className="btn-primary">Guardar Profesional</button>
                </form>
            </div>
            <h3>Staff Médico y Tratamientos</h3>
            <div className="pro-card" style={{padding:0}}>
                <table className="data-table">
                    <thead><tr><th>Nombre</th><th>Especialidad Principal</th><th>Tratamientos Asignados</th></tr></thead>
                    <tbody>
                        {pros.map(p=>(
                            <tr key={p.id}>
                                <td>{p.nombreCompleto}</td>
                                <td>{p.especialidad}</td>
                                <td>
                                    <ul style={{margin:0, paddingLeft:20, fontSize:'0.8rem', color:'#666'}}>
                                        {TRATAMIENTOS.filter(t => t.profesionalesIds.includes(p.id)).map(t => (
                                            <li key={t.id}>{t.tratamiento}</li>
                                        ))}
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
            const [y, m, d] = fecha.split('-');
            const dateObj = new Date(y, m - 1, d);
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
        await loadConfigs(); // RECARGA FORZADA DE TABLA
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
                                <td>{c.fecha ? new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-CL') : 'Día genérico'}</td>
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
                                        <strong style={{display:'block', marginBottom:5}}>{new Date(fecha+'T00:00:00').toLocaleDateString('es-CL', {weekday:'long', day:'numeric', month:'long'})}</strong>
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

// ESTE ES EL COMPONENTE QUE FALTABA Y QUE CAUSABA EL PANTALLAZO BLANCO
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

// =========================================================
// WEB PACIENTE - ESTILO REDSALUD (INTEGRADA)
// =========================================================
function WebPaciente() {
    const [step, setStep] = useState(0); 
    const [profesionales, setProfesionales] = useState([]);
    const [form, setForm] = useState({ rut:'', nombre:'', email:'', telefono:'', especialidad:'', tratamientoId:'', profesionalId:'', horarioId:'' });
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [pacienteId, setPacienteId] = useState(null);
    
    // ESTADO PARA LA VISTA DE AGENDAS TIPO REDSALUD
    const [multiAgenda, setMultiAgenda] = useState({}); // { '2023-12-16': [ {pro, slots} ] }
    const [selectedDateKey, setSelectedDateKey] = useState(null); // Fecha seleccionada en Tabs
    const [availableDates, setAvailableDates] = useState([]); // Array de fechas para los Tabs

    useEffect(()=>{ getProfesionales().then(setProfesionales) },[]);

    const especialidades = [...new Set(TRATAMIENTOS.map(t => t.especialidad))];
    const prestaciones = TRATAMIENTOS.filter(t => t.especialidad === form.especialidad);
    const tratamientoSel = TRATAMIENTOS.find(t => t.id === parseInt(form.tratamientoId));
    
    // Cuando confirmamos tratamiento, cargamos TODAS las agendas
    const handleTreatmentConfirm = async () => {
        setLoading(true);
        // 1. Identificar profesionales que hacen este tratamiento
        const prosAptos = profesionales.filter(p => tratamientoSel.profesionalesIds.includes(p.id));
        
        // 2. Traer horarios de TODOS ellos
        const promises = prosAptos.map(async p => {
            const horarios = await getHorariosByProfesional(p.id);
            // Filtrar solo futuros
            return { 
                profesional: p, 
                slots: Array.isArray(horarios) ? horarios.filter(x => new Date(x.fecha) > new Date()) : [] 
            };
        });

        const results = await Promise.all(promises);

        // 3. Organizar por FECHA para la vista tipo RedSalud
        const agendaMap = {};
        const datesSet = new Set();

        results.forEach(({profesional, slots}) => {
            slots.forEach(slot => {
                const dateKey = toDateKey(slot.fecha); // YYYY-MM-DD
                datesSet.add(dateKey);
                
                if (!agendaMap[dateKey]) agendaMap[dateKey] = [];
                
                // Buscar si ya agregamos a este profesional en esta fecha
                let proEntry = agendaMap[dateKey].find(entry => entry.profesional.id === profesional.id);
                if (!proEntry) {
                    proEntry = { profesional, slots: [] };
                    agendaMap[dateKey].push(proEntry);
                }
                proEntry.slots.push(slot);
            });
        });

        // Ordenar fechas cronológicamente
        const sortedDates = Array.from(datesSet).sort();
        
        setMultiAgenda(agendaMap);
        setAvailableDates(sortedDates);
        
        if (sortedDates.length > 0) setSelectedDateKey(sortedDates[0]); // Seleccionar la primera fecha disponible
        
        setLoading(false);
        setStep(3); // Pasar a la vista de agenda
    };

    // Funciones Auxiliares
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
        setStep(4); // Confirmar
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

    // Render Final Éxito
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
            
            {step > 0 && (
                <div className="stepper">
                    <div className="step-line"></div>
                    {STEPS.map(s => <div key={s.n} className={`step-dot ${step>=s.n?'active':''}`}>{s.n}</div>)}
                </div>
            )}

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
                        
                        {/* FECHAS (TABS) */}
                        {availableDates.length === 0 ? <p>No hay horas disponibles próximamente.</p> : (
                            <>
                                <div className="rs-date-tabs">
                                    {availableDates.map(dateStr => {
                                        const dateObj = new Date(dateStr + 'T00:00:00');
                                        return (
                                            <div 
                                                key={dateStr} 
                                                className={`rs-date-tab ${selectedDateKey === dateStr ? 'selected' : ''}`}
                                                onClick={() => setSelectedDateKey(dateStr)}
                                            >
                                                <div className="rs-day-name">{dateObj.toLocaleDateString('es-CL', {weekday: 'short'})}</div>
                                                <div className="rs-day-number">{dateObj.getDate()}</div>
                                                <div className="rs-day-name" style={{fontSize:'0.7rem'}}>{dateObj.toLocaleDateString('es-CL', {month: 'short'})}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* LISTA DE PROFESIONALES (RED SALUD STYLE) */}
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
                                                        <button 
                                                            key={slot.id} 
                                                            className="rs-slot-btn"
                                                            onClick={() => selectSlot(entry.profesional.id, slot.id)}
                                                        >
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

                        <div className="web-actions" style={{marginTop:30}}>
                            <button className="web-btn-white" onClick={()=>setStep(2)}>Volver</button>
                        </div>
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