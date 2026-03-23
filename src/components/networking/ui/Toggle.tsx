// @ts-nocheck
import { S } from "../styles";
export const Toggle = ({ enabled, onChange, label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${S.borderLight}` }}>
    <span style={{ fontSize: "13px", color: S.text, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: enabled ? S.green : S.border,
        position: "relative", transition: "background 0.2s"
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: enabled ? 23 : 3,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }}/>
    </button>
  </div>
);
