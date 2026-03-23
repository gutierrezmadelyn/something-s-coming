// @ts-nocheck
import { S } from "./styles";

export default function CohortPicker({ cohorts, selectedCohortId, onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 150, background: "rgba(250,251,252,0.98)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${S.border}`, padding: "12px 20px" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <p style={{ fontSize: "11px", color: S.textTer, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" }}>Seleccionar cohorte</p>
        {cohorts.filter(c => c.is_active).map(c => (
          <button key={c.id} onClick={() => { onSelect(c.id); onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", marginBottom: "6px", borderRadius: "12px", background: c.id === selectedCohortId ? `${c.color || S.blue}12` : S.card, border: `1.5px solid ${c.id === selectedCohortId ? (c.color || S.blue) : S.border}`, cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: "20px" }}>{c.icon || "📋"}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>{c.name}</span>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>{c.description}</p>
            </div>
            <span style={{ fontSize: "10px", color: S.textTer, background: S.cardLight, padding: "2px 8px", borderRadius: "6px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              {c.memberCount || 0}
            </span>
          </button>
        ))}
        {cohorts.length === 0 && (
          <p style={{ textAlign: "center", color: S.textTer, padding: "20px", fontSize: "13px" }}>
            No hay cohortes disponibles
          </p>
        )}
      </div>
    </div>
  );
}
