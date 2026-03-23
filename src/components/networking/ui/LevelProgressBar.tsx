// @ts-nocheck
import { S } from "../styles";
import { LEAGUE_ICONS } from "../constants";
import { getLevel, getLevelThresholds } from "../utils";
export const LevelProgressBar = ({ profile }) => {
  const level = getLevel(profile.xp || 0);
  const thresholds = getLevelThresholds(level);
  const progress = level === 5 ? 100 : ((profile.xp - thresholds.min) / (thresholds.max - thresholds.min + 1)) * 100;
  const xpToNext = level === 5 ? 0 : thresholds.max - profile.xp + 1;
  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: S.textSec, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
          Nivel {level} · Liga {LEAGUE_ICONS[profile.league || 'none']} {profile.league?.charAt(0).toUpperCase() + profile.league?.slice(1) || 'Ninguna'}
        </span>
        {level < 5 && (
          <span style={{ fontSize: "11px", color: S.blue, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
            {xpToNext} XP para subir
          </span>
        )}
      </div>
      <div style={{ height: "10px", background: S.border, borderRadius: "5px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${Math.min(progress, 100)}%`,
          background: `linear-gradient(90deg, ${S.green}, ${S.greenLight})`,
          borderRadius: "5px",
          transition: "width 0.5s ease"
        }}/>
      </div>
    </div>
  );
};
