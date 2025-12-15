cd C:\dev\agenda-citas-web

@'
// src/RouterRoot.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import LegacyApp from "./LegacyApp.jsx";

export default function RouterRoot() {
  return (
    <Routes>
      <Route path="/" element={<LegacyApp mode="paciente" />} />
      <Route path="/centro" element={<LegacyApp mode="centro" />} />
      <Route path="/legacy" element={<LegacyApp mode="legacy" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
'@ | Set-Content -Path .\src\RouterRoot.jsx -Encoding UTF8
