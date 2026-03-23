// @ts-nocheck
import { S } from "../styles";
export const Btn = ({ children, onClick, variant = "default", style: s = {} }) => {
  const base = { padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif", ...s };
  const styles = {
    default: { ...base, background: S.cardLight, color: S.textSec },
    primary: { ...base, background: S.blue, color: "#fff" },
    outline: { ...base, background: "transparent", border: `1.5px solid ${S.border}`, color: S.textSec },
    green: { ...base, background: S.green, color: "#fff" },
  };
  return <button onClick={onClick} style={styles[variant]}>{children}</button>;
};
