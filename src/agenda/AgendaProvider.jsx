// src/agenda/AgendaProvider.jsx

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getPacientes,
  getProfesionales,
  getHorariosByProfesional,
  getReservasDetalle,
  crearReserva,
  crearPaciente,
  cancelarReserva,
  reagendarReserva,
} from '../api';

const AgendaContext = createContext(null);

function normalizeError(err, fallback) {
  return err?.message || fallback || 'Error inesperado.';
}

export function AgendaProvider({ children }) {
  const [pacientes, setPacientes] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [inicialError, setInicialError] = useState('');

  const [horariosCache, setHorariosCache] = useState({});
  const inFlightHorariosRef = useRef({});
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    cargarInicial().catch(() => {});
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarInicial = useCallback(async () => {
    try {
      setInicialError('');
      setLoadingInicial(true);
      const [pacs, pros, resvs] = await Promise.all([
        getPacientes(),
        getProfesionales(),
        getReservasDetalle(),
      ]);
      if (!mountedRef.current) return;
      setPacientes(pacs);
      setProfesionales(pros);
      setReservas(resvs);
    } catch (err) {
      if (!mountedRef.current) return;
      setInicialError(normalizeError(err, 'Error cargando datos iniciales.'));
      console.error('Error cargando datos iniciales', err);
    } finally {
      if (!mountedRef.current) return;
      setLoadingInicial(false);
    }
  }, []);

  const refrescarReservas = useCallback(async () => {
    try {
      const resvs = await getReservasDetalle();
      if (!mountedRef.current) return;
      setReservas(resvs);
    } catch (err) {
      console.error('Error refrescando reservas', err);
      throw err;
    }
  }, []);

  const getHorariosCached = useCallback(
    async (profesionalId) => {
      const proId = Number(profesionalId);
      if (!proId) return [];

      // Cache hit
      if (horariosCache[proId]) return horariosCache[proId];

      // Request en vuelo
      if (inFlightHorariosRef.current[proId]) {
        return inFlightHorariosRef.current[proId];
      }

      const promise = (async () => {
        const horarios = await getHorariosByProfesional(proId);
        if (mountedRef.current) {
          setHorariosCache((prev) => ({ ...prev, [proId]: horarios }));
        }
        return horarios;
      })()
        .catch((err) => {
          // Limpieza robusta
          throw err;
        })
        .finally(() => {
          delete inFlightHorariosRef.current[proId];
        });

      inFlightHorariosRef.current[proId] = promise;
      return promise;
    },
    [horariosCache]
  );

  // Actions (se mantienen explícitas, sin “magia”)
  const actions = useMemo(
    () => ({
      crearPaciente: async (payload) => crearPaciente(payload),
      crearReserva: async (payload) => crearReserva(payload),
      cancelarReserva: async (id) => cancelarReserva(id),
      reagendarReserva: async (id, horarioDisponibleId) => reagendarReserva(id, horarioDisponibleId),
    }),
    []
  );

  const value = useMemo(
    () => ({
      pacientes,
      profesionales,
      reservas,
      loadingInicial,
      inicialError,
      horariosCache,
      cargarInicial,
      refrescarReservas,
      getHorariosCached,
      actions,
    }),
    [
      pacientes,
      profesionales,
      reservas,
      loadingInicial,
      inicialError,
      horariosCache,
      cargarInicial,
      refrescarReservas,
      getHorariosCached,
      actions,
    ]
  );

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda() {
  const ctx = useContext(AgendaContext);
  if (!ctx) {
    throw new Error('useAgenda debe usarse dentro de <AgendaProvider>.');
  }
  return ctx;
}
