// src/catalogo.js

// Catálogo simplificado de prestaciones CISD
// Puedes ampliar o ajustar códigos/valores según tu planilla oficial.

export const TRATAMIENTOS = [
    // FONOAUDIOLOGIA ADULTO ----------------------------------------
    {
        id: 'fono-adulto-eval-online',
        especialidad: 'Fonoaudiologia Adulto',
        categoria: 'Evaluacion',
        tratamiento: 'Evaluacion fonoaudiologica adulto online',
        codigoFonasa: '13-02-2003',
        descripcion: 'Evaluacion de voz, habla y lenguaje en modalidad online.',
        valor: 20000,
        modalidad: 'Online',
        profesionalesIds: [1], // Bastían Miro
    },
    {
        id: 'fono-adulto-eval-presencial',
        especialidad: 'Fonoaudiologia Adulto',
        categoria: 'Evaluacion',
        tratamiento: 'Evaluacion fonoaudiologica adulto presencial - Providencia',
        codigoFonasa: '13-02-2004',
        descripcion:
            'Evaluacion de voz, habla y lenguaje en consulta presencial en Providencia.',
        valor: 35000,
        modalidad: 'Presencial',
        profesionalesIds: [1, 2], // Bastian y/o Fernanda
    },
    {
        id: 'fono-adulto-eval-domicilio',
        especialidad: 'Fonoaudiologia Adulto',
        categoria: 'Evaluacion',
        tratamiento:
            'Evaluacion fonoaudiologica adulto domicilio - Region Metropolitana',
        codigoFonasa: '13-02-2005',
        descripcion:
            'Evaluacion de voz, habla y lenguaje en domicilio dentro de la Region Metropolitana.',
        valor: 50000,
        modalidad: 'Domicilio',
        profesionalesIds: [1],
    },

    // FONOAUDIOLOGIA INFANTO-JUVENIL -------------------------------
    {
        id: 'fono-infanto-eval-online',
        especialidad: 'Fonoaudiologia Infanto-Juvenil',
        categoria: 'Evaluacion',
        tratamiento: 'Evaluacion fonoaudiologica infanto-juvenil online',
        codigoFonasa: '13-02-2006',
        descripcion:
            'Evaluacion del habla, lenguaje y comunicacion en ninos y adolescentes, modalidad online.',
        valor: 22000,
        modalidad: 'Online',
        profesionalesIds: [2],
    },
    {
        id: 'fono-infanto-eval-presencial',
        especialidad: 'Fonoaudiologia Infanto-Juvenil',
        categoria: 'Evaluacion',
        tratamiento:
            'Evaluacion fonoaudiologica infanto-juvenil presencial - Providencia',
        codigoFonasa: '13-02-2007',
        descripcion:
            'Evaluacion del habla, lenguaje y comunicacion en consulta presencial en Providencia.',
        valor: 35000,
        modalidad: 'Presencial',
        profesionalesIds: [2],
    },

    // PSICOLOGIA ADULTO --------------------------------------------
    {
        id: 'psico-adulto-eval-online',
        especialidad: 'Psicologia Adulto',
        categoria: 'Evaluacion',
        tratamiento: 'Evaluacion Psicologia Adulto Online',
        codigoFonasa: '09-02-2001',
        descripcion:
            'Psicodiagnostico y plan de tratamiento inicial en adultos, modalidad online.',
        valor: 25000,
        modalidad: 'Online',
        profesionalesIds: [3, 4, 5],
    },
    {
        id: 'psico-adulto-consulta-online',
        especialidad: 'Psicologia Adulto',
        categoria: 'Consulta',
        tratamiento: 'Consulta Psicologia Adulto online',
        codigoFonasa: '09-02-2002',
        descripcion: 'Sesion de psicoterapia individual para adultos.',
        valor: 30000,
        modalidad: 'Online',
        profesionalesIds: [3, 4, 5],
    },

    // PSICOLOGIA INFANTO-JUVENIL -----------------------------------
    {
        id: 'psico-infanto-eval-online',
        especialidad: 'Psicologia Infanto-Juvenil',
        categoria: 'Evaluacion',
        tratamiento: 'Evaluacion Psicologia Infanto-Juvenil Online',
        codigoFonasa: '09-02-2201',
        descripcion:
            'Psicodiagnostico infanto-juvenil y orientacion a familia, modalidad online.',
        valor: 26000,
        modalidad: 'Online',
        profesionalesIds: [3, 4, 5],
    },
    {
        id: 'psico-infanto-consulta-online',
        especialidad: 'Psicologia Infanto-Juvenil',
        categoria: 'Consulta',
        tratamiento: 'Consulta Psicologia Infanto-Juvenil Online',
        codigoFonasa: '09-02-2202',
        descripcion:
            'Sesion de psicoterapia individual para ninos y adolescentes.',
        valor: 26000,
        modalidad: 'Online',
        profesionalesIds: [3, 4, 5],
    },

    // MATRONA ADULTO TELECONSULTA ----------------------------------
    {
        id: 'matrona-adulto-teleconsulta-eval',
        especialidad: 'Matrona Adulto Teleconsulta',
        categoria: 'Evaluacion',
        tratamiento: 'Consulta Matrona Adulto Teleconsulta',
        codigoFonasa: '11-01-1942',
        descripcion:
            'Evaluacion integral en salud sexual y reproductiva, embarazo y postparto.',
        valor: 20000,
        modalidad: 'Online',
        profesionalesIds: [6],
    },

    // PSICOPEDAGOGIA INFANTO-JUVENIL -------------------------------
    {
        id: 'psicoped-infanto-eval-online',
        especialidad: 'Psicopedagogia Infanto-Juvenil',
        categoria: 'Evaluacion',
        tratamiento: 'Evaluacion Psicopedagogica Infanto-Juvenil Online',
        codigoFonasa: 'PARTICULAR',
        descripcion:
            'Evaluacion del aprendizaje, lectoescritura y funciones ejecutivas.',
        valor: 20000,
        modalidad: 'Online',
        profesionalesIds: [7],
    },
    {
        id: 'psicoped-infanto-sesion-online',
        especialidad: 'Psicopedagogia Infanto-Juvenil',
        categoria: 'Sesion',
        tratamiento: 'Sesion Psicopedagogia Infanto-Juvenil Online',
        codigoFonasa: 'PARTICULAR',
        descripcion:
            'Sesion de intervencion psicopedagogica individual online.',
        valor: 20000,
        modalidad: 'Online',
        profesionalesIds: [7],
    },

    // PACKS --------------------------------------------------------
    {
        id: 'pack-fono-mensual',
        especialidad: 'Pack Fonoaudiologia',
        categoria: 'Pack Mensual',
        tratamiento: 'Pack Mensual Fonoaudiologia (4 sesiones online)',
        codigoFonasa: 'PACK-FO-4S',
        descripcion:
            '4 sesiones online de tratamiento fonoaudiologico mensual con seguimiento.',
        valor: 72000,
        modalidad: 'Online',
        profesionalesIds: [1, 2],
    },
    {
        id: 'pack-psico-bienestar',
        especialidad: 'Pack Psicologia',
        categoria: 'Pack Mensual',
        tratamiento:
            'Pack Bienestar Emocional (4 sesiones Psicologia online)',
        codigoFonasa: 'PACK-PSI-4S',
        descripcion:
            '4 sesiones online de psicoterapia orientada a bienestar emocional.',
        valor: 90000,
        modalidad: 'Online',
        profesionalesIds: [3, 4, 5],
    },
];

// Helpers para selects

export function getEspecialidades() {
    const set = new Set(TRATAMIENTOS.map((t) => t.especialidad));
    return Array.from(set);
}

export function getTratamientosByEspecialidad(especialidad) {
    return TRATAMIENTOS.filter(
        (t) => t.especialidad === especialidad,
    );
}

export function getTratamientoById(id) {
    return TRATAMIENTOS.find((t) => t.id === id) || null;
}
