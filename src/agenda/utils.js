// src/agenda/utils.js

export const PASOS_FLUJO = [
    'Datos personales',
    'Especialidad y modalidad',
    'Selección de día, profesional y horario',
    'Resumen y confirmación',
  ];
  
  // ----------------------- UTILIDADES -----------------------
  
  export function limpiarRut(value) {
    return (value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  }
  
  export function formatearRut(value) {
    const clean = limpiarRut(value);
    if (!clean) return '';
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    if (!cuerpo) return dv;
  
    const reversed = cuerpo.split('').reverse();
    const conPuntos = [];
    for (let i = 0; i < reversed.length; i++) {
      if (i > 0 && i % 3 === 0) conPuntos.push('.');
      conPuntos.push(reversed[i]);
    }
    const cuerpoFormateado = conPuntos.reverse().join('');
    return `${cuerpoFormateado}-${dv}`;
  }
  
  export function esRutValido(rut) {
    const clean = limpiarRut(rut);
    if (clean.length < 2) return false;
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
  
    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i], 10) * factor;
      factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = suma % 11;
    const dvEsperado = 11 - resto;
    let dvCalc;
    if (dvEsperado === 11) dvCalc = '0';
    else if (dvEsperado === 10) dvCalc = 'K';
    else dvCalc = String(dvEsperado);
    return dvCalc === dv.toUpperCase();
  }
  
  export function formatearTelefono(value) {
    const digits = (value || '').replace(/\D/g, '').slice(0, 9);
    if (!digits) return '';
    if (digits.length <= 1) return digits;
    if (digits.length <= 5) return `${digits[0]} ${digits.slice(1)}`;
    return `${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  }
  
  export function esTelefonoChilenoValido(value) {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length === 9 && digits.startsWith('9');
  }
  
  export function esEmailValido(value) {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  
  export function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  export function formatShortDay(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
  }
  
  export function formatShortDate(iso) {
    const d = new Date(iso);
    return d.getDate().toString().padStart(2, '0');
  }
  
  export function toDateKey(iso) {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  