// @ts-nocheck
import { S } from "../styles";
export const CompatBadge = ({ score }) => {
  const c = score >= 75 ? S.green : score >= 50 ? S.yellow : S.red;
  return (
    <div style={{ position: "absolute", top: 12, right: 12, background: S.card, borderRadius: "10px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", border: `1px solid ${S.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }}/>
      <span style={{ color: c, fontSize: "12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{score}%</span>
    </div>
  );
};
