// @ts-nocheck
import { S } from "../styles";
export const XPChip = ({ xp, size = "normal" }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: size === "small" ? "2px 8px" : "4px 12px",
    borderRadius: "12px",
    background: S.yellowBg,
    border: `1px solid ${S.yellow}30`
  }}>
    <span style={{ fontSize: size === "small" ? "12px" : "14px" }}>⚡</span>
    <span style={{ color: S.yellow, fontSize: size === "small" ? "11px" : "13px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{xp} XP</span>
  </div>
);
