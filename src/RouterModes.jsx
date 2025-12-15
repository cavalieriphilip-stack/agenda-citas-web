import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LegacyApp from "./LegacyApp.jsx";

export default function RouterModes() {
  return (
    <Routes>
      {/* Público paciente: SOLO wizard */}
      <Route path="/" element={<LegacyApp mode="paciente" />} />

      {/* Centro médico: panel con menú vertical */}
      <Route path="/centro" element={<LegacyApp mode="centro" />} />

      {/* Vista antigua con tabs (panel/flujo) */}
      <Route path="/legacy" element={<LegacyApp mode="legacy" />} />

      {/* Redirecciones robustas */}
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
