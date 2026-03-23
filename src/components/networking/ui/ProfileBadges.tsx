// @ts-nocheck
import { S } from "../styles";
export const ProfileBadges = ({ profile }) => {
  const badges = [];
  if ((profile.conversationsStarted || 0) >= 3) {
    badges.push({ icon: "🔗", label: "Conector", bg: S.blueBg, color: S.blue });
  }
  if ((profile.matchCount || 0) >= 4) {
    badges.push({ icon: "⭐", label: "Popular", bg: S.yellowBg, color: S.yellowText });
  }
  if (profile.pitch && profile.expertise?.length && profile.wantsToLearn && profile.sectors?.length) {
    badges.push({ icon: "✅", label: "Completo", bg: S.greenBg, color: S.green });
  }
  if ((profile.streak || 0) >= 7) {
    badges.push({ icon: "🔥", label: `${profile.streak} días`, bg: S.orangeBg, color: S.orange });
  }
  if ((profile.xp || 0) >= 200) {
    badges.push({ icon: "⚡", label: "Power", bg: S.purpleBg, color: S.purple });
  }
  if (!badges.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
      {badges.map((b, i) => (
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", gap: "3px",
          padding: "3px 8px", borderRadius: "6px",
          background: b.bg, fontSize: "10px", fontWeight: 700,
          color: b.color, fontFamily: "'DM Sans', sans-serif"
        }}>
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  );
};
