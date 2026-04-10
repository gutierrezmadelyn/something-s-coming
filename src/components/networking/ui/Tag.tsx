// @ts-nocheck
import { S } from "../styles";
export const Tag = ({ children, bg = S.cardLight, color = S.textSec }) => (
  <span style={{
    display: "inline-block", padding: "5px 12px", borderRadius: "20px",
    fontSize: "11px", fontWeight: 600, background: bg, color,
    marginRight: "4px", marginBottom: "4px",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.01em",
    border: `1px solid ${color}15`,
  }}>{children}</span>
);
