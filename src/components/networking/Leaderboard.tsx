// @ts-nocheck
import { useState } from "react";
import { useLeaderboard } from "@/hooks/useCohorts";
import { S } from "./styles";
import { LEAGUE_ICONS } from "./constants";
import { getLevel, getLevelThresholds } from "./utils";
import { Avatar, XPChip, StreakChip } from "./ui";

export default function Leaderboard({ profiles, matches = [], currentUserId, onContact, cohortId }) {
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard(cohortId);

  const leaderboardProfiles = leaderboard.map(entry => ({
    id: entry.user_id,
    name: entry.name,
    avatar: entry.avatar_initials || entry.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "??",
    color: entry.avatar_color || "#1CB0F6",
    photo: entry.photo_url,
    xp: entry.xp,
    league: entry.league,
    rank: entry.rank,
    hasLoggedIn: true,
  }));

  const sorted = leaderboardProfiles.length > 0
    ? leaderboardProfiles
    : [...profiles].filter(p => p.hasLoggedIn).sort((a, b) => (b.xp || 0) - (a.xp || 0));

  const top3 = sorted.slice(0, 3);

  const Pedestal = ({ profile, position }) => {
    const heights = { 1: 140, 2: 110, 3: 90 };
    const colors = { 1: S.yellow, 2: "#C0C0C0", 3: "#CD7F32" };
    const order = { 1: 2, 2: 1, 3: 3 };
    if (!profile) return null;
    return (
      <div style={{ order: order[position], display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <Avatar profile={profile} size={position === 1 ? 64 : 52}/>
          <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: colors[position], width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: position === 1 ? "#000" : "#fff", border: `3px solid ${S.card}`, fontFamily: "'DM Sans', sans-serif" }}>
            {position}
          </div>
        </div>
        <p style={{ fontSize: "12px", fontWeight: 700, color: S.text, margin: "8px 0 2px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>{profile.name.split(" ")[0]}</p>
        <XPChip xp={profile.xp || 0} size="small"/>
        {profile.id !== currentUserId && onContact && (
          <button onClick={() => onContact(profile)} style={{ marginTop: "4px", padding: "3px 10px", borderRadius: "8px", background: S.blueBg, border: `1px solid ${S.blue}30`, color: S.blue, fontSize: "10px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            💬 Mensaje
          </button>
        )}
        <div style={{ width: "100%", height: heights[position], background: `linear-gradient(180deg, ${colors[position]}40, ${colors[position]}20)`, borderRadius: "12px 12px 0 0", marginTop: "12px", border: `2px solid ${colors[position]}50`, borderBottom: "none" }}/>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "20px" }}>🏆 Top Conectores</h3>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "24px", padding: "0 10px" }}>
        <Pedestal profile={top3[1]} position={2}/>
        <Pedestal profile={top3[0]} position={1}/>
        <Pedestal profile={top3[2]} position={3}/>
      </div>
      <div style={{ background: S.card, borderRadius: "16px", border: `1px solid ${S.border}`, overflow: "hidden" }}>
        {sorted.map((p, i) => {
          const level = getLevel(p.xp || 0);
          const thresholds = getLevelThresholds(level);
          const progress = level === 5 ? 100 : ((p.xp - thresholds.min) / (thresholds.max - thresholds.min + 1)) * 100;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderBottom: i < sorted.length - 1 ? `1px solid ${S.border}` : "none", background: i < 3 ? `${S.yellow}08` : "transparent" }}>
              <span style={{ width: 28, height: 28, borderRadius: "8px", background: i < 3 ? S.yellow : S.cardLight, color: i < 3 ? "#000" : S.textSec, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{i + 1}</span>
              <Avatar profile={p} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</span>
                  <span style={{ fontSize: "12px" }}>{LEAGUE_ICONS[p.league || 'none']}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "10px", color: S.textTer, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Nv.{level}</span>
                  <div style={{ flex: 1, height: 6, background: S.border, borderRadius: "3px", maxWidth: "80px" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: S.green, borderRadius: "3px" }}/>
                  </div>
                  <span style={{ fontSize: "10px", color: S.textTer, fontFamily: "'DM Sans', sans-serif" }}>💬 {p.conversationsStarted || 0}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {(p.streak || 0) > 0 && <StreakChip streak={p.streak} size="small"/>}
                <XPChip xp={p.xp || 0} size="small"/>
              </div>
              {p.id !== currentUserId && onContact && (
                <button onClick={(e) => { e.stopPropagation(); onContact(p); }} title={`Mensaje a ${p.name.split(" ")[0]}`}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: matches.some(m => m.id === p.id) ? S.greenBg : S.blueBg, border: `1.5px solid ${matches.some(m => m.id === p.id) ? S.green : S.blue}30`, color: matches.some(m => m.id === p.id) ? S.green : S.blue, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", flexShrink: 0 }}>
                  💬
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "20px", background: S.card, borderRadius: "16px", border: `1px solid ${S.border}`, padding: "16px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, color: S.text, margin: "0 0 12px", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>¿Cómo gano XP? ⚡</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ background: S.greenBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.green}30` }}>
            <span style={{ fontSize: "20px" }}>✅</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.green, fontFamily: "'DM Sans', sans-serif" }}>Perfil completo</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.green, fontFamily: "'DM Sans', sans-serif" }}>+50</p>
          </div>
          <div style={{ background: S.blueBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.blue}30` }}>
            <span style={{ fontSize: "20px" }}>💬</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.blue, fontFamily: "'DM Sans', sans-serif" }}>Conversación</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.blue, fontFamily: "'DM Sans', sans-serif" }}>+30</p>
          </div>
          <div style={{ background: S.purpleBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.purple}30` }}>
            <span style={{ fontSize: "20px" }}>🤝</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.purple, fontFamily: "'DM Sans', sans-serif" }}>Match</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.purple, fontFamily: "'DM Sans', sans-serif" }}>+15</p>
          </div>
          <div style={{ background: S.orangeBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.orange}30` }}>
            <span style={{ fontSize: "20px" }}>👆</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.orange, fontFamily: "'DM Sans', sans-serif" }}>Swipe</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.orange, fontFamily: "'DM Sans', sans-serif" }}>+2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
