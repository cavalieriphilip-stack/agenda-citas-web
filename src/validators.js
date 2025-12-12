// src/validators.js

// --- Helpers RUT chileno ----------------------------------------------

export function cleanRut(rut) {
    if (!rut) return '';
    return rut.replace(/\./g, '').replace(/-/g, '').trim();
}

// Aplica máscara: 199055860 -> 19.905.586-0
export function formatRutInput(raw) {
    if (!raw) return '';

    // Solo dígitos y k/K
    let value = raw.replace(/[^\dkK]/g, '').toUpperCase();

    if (value.length === 0) return '';

    if (value.length === 1) {
        // Solo dígito inicial
        return value;
    }

    const body = value.slice(0, -1);
    const dv = value.slice(-1);

    // Agregar puntos al body
    const reversed = body.split('').reverse();
    const parts = [];
    for (let i = 0; i < reversed.length; i += 3) {
        parts.push(reversed.slice(i, i + 3).join(''));
    }
    const bodyWithDots = parts
        .map((p) => p.split('').reverse().join(''))
        .reverse()
        .join('.');

    return `${bodyWithDots}-${dv}`;
}

export function isValidRut(rut) {
    const clean = cleanRut(rut);
    if (!/^\d{7,8}[0-9kK]$/.test(clean)) return false;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toLowerCase();

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i], 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const dvExpectedNum = 11 - remainder;

    let dvExpected;
    if (dvExpectedNum === 11) dvExpected = '0';
    else if (dvExpectedNum === 10) dvExpected = 'k';
    else dvExpected = String(dvExpectedNum);

    return dv === dvExpected;
}

// --- Teléfono chileno --------------------------------------------------

export function isValidChileanPhone(telefono) {
    if (typeof telefono !== 'string') return false;
    const trimmed = telefono.replace(/\s+/g, '');
    // 9XXXXXXXX, +569XXXXXXXX, 569XXXXXXXX
    const re = /^(?:\+?56)?9\d{8}$/;
    return re.test(trimmed);
}

// --- Email -------------------------------------------------------------

export function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const trimmed = email.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(trimmed);
}

// --- Validador combinado para formularios de contacto -----------------

export function validateDatosContacto({ rut, telefono, email }) {
    const errors = {};

    if (!rut || !isValidRut(rut)) {
        errors.rut = 'Ingresa un RUT chileno valido.';
    }

    if (!telefono || !isValidChileanPhone(telefono)) {
        errors.telefono =
            'Ingresa un telefono chileno valido (ej: 9XXXXXXXX o +569XXXXXXXX).';
    }

    if (!email || !isValidEmail(email)) {
        errors.email = 'Ingresa un correo electronico valido.';
    }

    return errors;
}
