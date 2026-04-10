// @ts-nocheck
import { S } from "./styles";
import { LogOut } from "lucide-react";

export default function Header({ me, selectedCohort, onToggleCohortPicker, onLogout }) {
  return (
    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, background: "rgba(250,251,252,0.95)", backdropFilter: "blur(12px)" }}>
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "22px", fontWeight: 700, color: S.blue, margin: 0 }}>Negoworking</h1>
        <button onClick={onToggleCohortPicker} style={{ fontSize: "9px", color: selectedCohort?.color || S.textTer, letterSpacing: "0.12em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
          {selectedCohort?.icon} {selectedCohort?.name || "Todas las cohortes"} ▾
        </button>
      </div>
      <button onClick={onLogout} style={{ padding: "6px 12px", borderRadius: "8px", background: S.cardLight, border: `1px solid ${S.border}`, color: S.textSec, fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
        <LogOut size={12}/> Salir
      </button>
    </div>
  );
}
