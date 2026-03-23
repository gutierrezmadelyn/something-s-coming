// @ts-nocheck
import { S } from "../styles";
export const Avatar = ({ profile, size = 48 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: profile.photo ? `url(${profile.photo}) center/cover` : `linear-gradient(135deg, ${profile.color}, ${profile.color}CC)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700, color: "#fff", flexShrink: 0, border: `2px solid ${S.border}`, fontFamily: "'DM Sans', sans-serif" }}>
    {!profile.photo && profile.avatar}
  </div>
);
