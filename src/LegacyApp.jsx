import React from "react";
import App from "./App.jsx";

/**
 * Wrapper para mantener tu App estable EXACTAMENTE como está,
 * sin renombrar exports ni tocar lógica.
 */
export default function LegacyApp() {
  return <App />;
}
