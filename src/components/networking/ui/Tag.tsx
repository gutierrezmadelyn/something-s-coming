// @ts-nocheck
import { S } from "../styles";
export const Tag = ({ children, bg = S.cardLight, color = S.textSec }) => (
  <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, background: bg, color, marginRight: "4px", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>{children}</span>
);
