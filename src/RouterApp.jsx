import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PacientePage from "./pages/PacientePage.jsx";
import CentroPage from "./pages/CentroPage.jsx";
import LegacyApp from "./LegacyApp.jsx";

export default function RouterApp() {
  return (
    <Routes>
      {/* Vista pública paciente */}
      <Route path="/" element={<PacientePage />} />

      {/* Vista centro médico */}
      <Route path="/centro" element={<CentroPage />} />

      {/* Vista estable anterior (sin tocar tu App actual) */}
      <Route path="/legacy" element={<LegacyApp />} />

      {/* Redirecciones robustas */}
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
