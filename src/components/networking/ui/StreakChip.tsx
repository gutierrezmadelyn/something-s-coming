// @ts-nocheck
import { S } from "../styles";
export const StreakChip = ({ streak, size = "normal" }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: size === "small" ? "2px 8px" : "4px 12px",
    borderRadius: "12px",
    background: S.orangeBg,
    border: `1px solid ${S.orange}30`
  }}>
    <span style={{ fontSize: size === "small" ? "12px" : "14px" }}>🔥</span>
    <span style={{ color: S.orange, fontSize: size === "small" ? "11px" : "13px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{streak}</span>
  </div>
);
