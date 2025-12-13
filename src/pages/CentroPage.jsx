import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function CentroPage() {
  useEffect(() => {
    document.title = "Agenda CISD - Panel (Centro Médico)";
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Panel Centro Médico</h2>
      <p style={{ marginTop: 0 }}>
        Aquí quedará <strong>solo</strong> el panel interno del centro médico.
      </p>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <p style={{ marginTop: 0 }}>
          Por ahora, tu vista estable sigue disponible en{" "}
          <strong>
            <Link to="/legacy">/legacy</Link>
          </strong>
          .
        </p>
        <p style={{ marginBottom: 0 }}>
          En el siguiente paso movemos el panel real acá (sin simplificar, solo
          separar).
        </p>
      </div>
    </div>
  );
}
