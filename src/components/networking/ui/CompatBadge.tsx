// @ts-nocheck
import { S } from "../styles";
export const CompatBadge = ({ score }) => {
  const c = score >= 75 ? S.green : score >= 50 ? S.yellow : score >= 30 ? S.orange : S.textTer;
  const label = score >= 75 ? "Alta" : score >= 50 ? "Media" : score >= 30 ? "Baja" : "";
  return (
    <div style={{
      position: "absolute", top: 10, right: 10,
      background: `${c}12`, backdropFilter: "blur(8px)",
      borderRadius: "12px", padding: "5px 10px",
      display: "flex", alignItems: "center", gap: "6px",
      border: `1px solid ${c}25`,
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" fill="none" stroke={`${c}30`} strokeWidth="2"/>
        <circle cx="8" cy="8" r="7" fill="none" stroke={c} strokeWidth="2"
          strokeDasharray={`${(score / 100) * 44} 44`}
          strokeLinecap="round" transform="rotate(-90 8 8)"/>
      </svg>
      <span style={{ color: c, fontSize: "11px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{score}%</span>
    </div>
  );
};
